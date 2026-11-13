import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.resolve(import.meta.dirname, '..')
const COOKIE_FILE = path.join(ROOT, 'runtime', 'fb-cookies.json')
const STATE_FILE = path.join(ROOT, 'runtime', 'meta-state.json')
const RUNTIME = path.join(ROOT, 'runtime')
const profileDir =
  process.env.IG_PROFILE_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), 'rozetext', 'chrome-profile')

if (!fs.existsSync(COOKIE_FILE)) {
  console.log(JSON.stringify({ state: 'error', message: 'runtime/fb-cookies.json not found' }))
  process.exit(2)
}

const raw = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'))
const now = Date.now()
const SAME_SITE = { no_restriction: 'None', lax: 'Lax', strict: 'Strict' }

function toPlaywright(cookie) {
  const expiry = cookie.expires_iso
    ? Date.parse(cookie.expires_iso)
    : cookie.expirationDate
      ? cookie.expirationDate * 1000
      : 0
  if (expiry && expiry <= now) return null
  const sameSite = SAME_SITE[(cookie.sameSite || '').toLowerCase()]
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain || '.facebook.com',
    path: cookie.path || '/',
    expires: expiry ? Math.floor(expiry / 1000) : -1,
    httpOnly: Boolean(cookie.httpOnly),
    secure: cookie.secure !== false,
    ...(sameSite ? { sameSite } : {}),
  }
}

const cookies = raw.map(toPlaywright).filter(Boolean)

const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
})
const page = context.pages()[0] || (await context.newPage())

try {
  await context.clearCookies({ name: 'checkpoint' }).catch(() => {})
  await context.clearCookies({ domain: '.facebook.com' }).catch(() => {})
  await context.addCookies(cookies)

  await page.goto('https://business.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(6000)

  const fbCookies = await context.cookies('https://www.facebook.com')
  const hasSession = fbCookies.some((c) => c.name === 'c_user' && c.value)
  const checkpoint = fbCookies.some((c) => c.name === 'checkpoint')

  await context.storageState({ path: STATE_FILE })
  fs.mkdirSync(RUNTIME, { recursive: true })
  await page.screenshot({ path: path.join(RUNTIME, 'meta-imported.png') })

  console.log(
    JSON.stringify(
      {
        state: hasSession ? 'ok' : 'error',
        has_session: hasSession,
        checkpoint,
        url: page.url(),
        title: await page.title(),
        text: (await page.locator('body').innerText().catch(() => '')).replace(/\n{3,}/g, '\n\n').slice(0, 500),
      },
      null,
      2,
    ),
  )

  if (hasSession) fs.rmSync(COOKIE_FILE, { force: true })
} catch (error) {
  console.log(JSON.stringify({ state: 'error', message: error.message }, null, 2))
  process.exitCode = 2
} finally {
  await context.close().catch(() => {})
}
