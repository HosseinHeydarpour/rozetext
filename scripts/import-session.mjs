import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

const account = (process.argv.find((arg) => arg.startsWith('--account='))?.slice('--account='.length) || 'collect')
  .trim()
  .toLowerCase()
if (!/^[a-z][a-z0-9-]{0,20}$/.test(account) || account === 'main') {
  console.error('--account must be a non-main slug, e.g. collect')
  process.exit(1)
}

const prefix = `${account}-`
const stateFile = path.join(RUNTIME, `${prefix}ig-state.json`)
const lockFile = path.join(RUNTIME, `${prefix}login-blocked.json`)
const statusFile = path.join(RUNTIME, `${prefix}login.json`)
const cookiesArg = process.argv.find((arg) => arg.startsWith('--cookies='))?.slice('--cookies='.length)
const inputPath = path.resolve(cookiesArg || path.join(RUNTIME, `${prefix}cookies.json`))

const setStatus = (state, message) => {
  fs.writeFileSync(
    statusFile,
    JSON.stringify({ account, state, message, pid: process.pid, updated_at: new Date().toISOString() }, null, 2),
  )
}

const samePath = (a, b) => {
  const [x, y] = [path.resolve(a), path.resolve(b)]
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y
}

const isSavedSession =
  samePath(inputPath, stateFile) ||
  samePath(inputPath, path.join(RUNTIME, 'ig-state.json')) ||
  samePath(inputPath, path.join(RUNTIME, 'meta-state.json'))
if (isSavedSession) {
  console.error('Refusing to use a saved session file as the import input.')
  process.exit(1)
}
if (!fs.existsSync(inputPath)) {
  console.error(`Cookie file not found: ${inputPath}`)
  process.exit(1)
}

const envPrefix = `IG_${account.toUpperCase().replaceAll('-', '_')}`
const username = (process.env[`${envPrefix}_USERNAME`] || '').trim()
if (!username) {
  console.error(`${envPrefix}_USERNAME is missing in .env; the session cannot be verified.`)
  process.exit(1)
}

const mainProfile =
  process.env.IG_PROFILE_DIR ||
  path.join(process.env.LOCALAPPDATA || os.homedir(), 'rozetext', 'chrome-profile')
const profileDir = process.env[`${envPrefix}_PROFILE_DIR`] || `${mainProfile}-${account}`
if (samePath(profileDir, mainProfile)) {
  console.error('Refusing to run: this profile belongs to the main account.')
  process.exit(1)
}

const parseCookies = () => {
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const list = Array.isArray(raw) ? raw : raw.cookies
  if (!Array.isArray(list) || !list.length) throw new Error('The file has no cookies array.')

  const sameSite = (value) => {
    const v = String(value || '').toLowerCase()
    if (v === 'none' || v === 'no_restriction') return 'None'
    if (v === 'strict') return 'Strict'
    return 'Lax'
  }

  const byName = new Map()
  for (const cookie of list) {
    if (!cookie?.name || cookie.value === undefined || !cookie.domain) continue
    if (!/(^|\.)instagram\.com$/i.test(String(cookie.domain))) continue
    const exp = Number(cookie.expires ?? cookie.expirationDate)
    const site = sameSite(cookie.sameSite)
    byName.set(cookie.name, {
      name: cookie.name,
      value: String(cookie.value),
      domain: '.instagram.com',
      path: cookie.path || '/',
      expires: Number.isFinite(exp) && exp > 0 ? exp : -1,
      httpOnly: Boolean(cookie.httpOnly),
      secure: site === 'None' ? true : cookie.secure === undefined ? true : Boolean(cookie.secure),
      sameSite: site,
    })
  }
  return [...byName.values()]
}

let cookies
try {
  cookies = parseCookies()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
if (!cookies.some((c) => c.name === 'sessionid' && c.value)) {
  console.error('The cookie file has no sessionid.')
  process.exit(1)
}

const dsUser = (file) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    return parsed.cookies?.find((c) => c.name === 'ds_user_id')?.value || null
  } catch {
    return null
  }
}
const mainDsUser = dsUser(path.join(RUNTIME, 'ig-state.json'))
const importDsUser = cookies.find((c) => c.name === 'ds_user_id')?.value
if (mainDsUser && importDsUser && mainDsUser === importDsUser) {
  console.error('Refusing: this is the page session, not the collect account.')
  process.exit(1)
}

const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
})

let page
try {
  await context.addCookies(cookies)
  page = context.pages()[0] || (await context.newPage())
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 })

  for (const text of ['Allow all cookies', 'Allow essential cookies', 'Decline optional cookies']) {
    const button = page.getByRole('button', { name: text }).first()
    if ((await button.count()) && (await button.isVisible().catch(() => false))) {
      await button.click().catch(() => {})
      await page.waitForTimeout(500)
      break
    }
  }

  await page
    .locator('a[href^="/"][href$="/"] img[alt$="profile picture"]')
    .first()
    .waitFor({ state: 'attached', timeout: 15_000 })
    .catch(() => {})

  const info = await page.evaluate(() => {
    const profile = [...document.querySelectorAll('a[href]')].find(
      (a) =>
        /^\/[A-Za-z0-9._]+\/$/.test(a.getAttribute('href')) &&
        a.querySelector('img[alt$="profile picture"]'),
    )
    return {
      hasLoginForm: Boolean(document.querySelector('input[name="username"]')),
      profileHref: profile?.getAttribute('href') || null,
    }
  })
  const loggedInAs = info.profileHref ? info.profileHref.replaceAll('/', '') : null
  console.log(JSON.stringify({ account, cookies: cookies.length, loggedInAs, hasLoginForm: info.hasLoginForm }))

  if (info.hasLoginForm || loggedInAs !== username) {
    await page.screenshot({ path: path.join(RUNTIME, `${prefix}import-error.png`) }).catch(() => {})
    const reason = `Session not saved: logged in as ${loggedInAs || 'nobody'}, expected ${username}.`
    setStatus('error', reason)
    console.error(reason)
    await context.close()
    process.exit(2)
  }

  await context.storageState({ path: stateFile })
  fs.rmSync(lockFile, { force: true })
  setStatus('ok', 'Session imported; saved')
  fs.rmSync(inputPath, { force: true })
  console.log(`Saved ${path.relative(ROOT, stateFile)} and removed the cookie file.`)
  await context.close()
  process.exit(0)
} catch (error) {
  setStatus('error', error.message)
  console.error(error.message)
  if (page) await page.screenshot({ path: path.join(RUNTIME, `${prefix}import-error.png`) }).catch(() => {})
  await context.close().catch(() => {})
  process.exit(2)
}
