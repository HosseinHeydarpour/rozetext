import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const TIMEOUT_CODE = 5 * 60_000
const TIMEOUT_TOTAL = 15 * 60_000

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

// --account=main is the page account; any other slug reads IG_<SLUG>_* and gets its own files and profile.
const account = (process.argv.find((arg) => arg.startsWith('--account='))?.slice('--account='.length) || 'main')
  .trim()
  .toLowerCase()
if (!/^[a-z][a-z0-9-]{0,20}$/.test(account)) {
  console.error(`Invalid --account value: ${account}`)
  process.exit(1)
}
const prefix = account === 'main' ? '' : `${account}-`
const STATUS = path.join(RUNTIME, `${prefix}login.json`)
const CODE_FILE = path.join(RUNTIME, `${prefix}2fa.txt`)
const STATE_FILE = path.join(RUNTIME, `${prefix}ig-state.json`)
const LOCK_FILE = path.join(RUNTIME, `${prefix}login-blocked.json`)
const shot = (name) => path.join(RUNTIME, `${prefix}${name}.png`)

const envPrefix = `IG${account === 'main' ? '' : `_${account.toUpperCase().replaceAll('-', '_')}`}`
const username = (process.env[`${envPrefix}_USERNAME`] || '').trim()
const password = process.env[`${envPrefix}_PASSWORD`] || ''
const manual = process.argv.includes('--manual')
const useAuthenticator = process.argv.includes('--authenticator')
const mainProfile =
  process.env.IG_PROFILE_DIR ||
  path.join(process.env.LOCALAPPDATA || os.homedir(), 'rozetext', 'chrome-profile')
const profileDir =
  process.env[`${envPrefix}_PROFILE_DIR`] || (account === 'main' ? mainProfile : `${mainProfile}-${account}`)

if (account !== 'main' && path.resolve(profileDir) === path.resolve(mainProfile)) {
  console.error('Refusing to run: this profile belongs to the main account (IG_PROFILE_DIR).')
  process.exit(1)
}

fs.mkdirSync(RUNTIME, { recursive: true })
fs.rmSync(CODE_FILE, { force: true })

if (fs.existsSync(LOCK_FILE) && !process.argv.includes('--force') && !process.argv.includes('--manual')) {
  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'))
  console.log(`login blocked at ${lock.at}: ${lock.reason}. Fix ${envPrefix}_PASSWORD, then run once with --force.`)
  process.exit(3)
}

function block(reason) {
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ reason, at: new Date().toISOString() }, null, 2))
}

let lastState = ''
function setState(state, message = '') {
  if (state === lastState) return
  lastState = state
  fs.writeFileSync(
    STATUS,
    JSON.stringify({ account, state, message, pid: process.pid, updated_at: new Date().toISOString() }, null, 2),
  )
  console.log(`[${state}] ${message}`)
}

const pause = (page, min = 500, max = 1200) =>
  page.waitForTimeout(min + Math.floor(Math.random() * Math.max(1, max - min)))

async function typeLikeHuman(page, locator, text) {
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  await locator.click()
  await pause(page, 200, 500)
  await locator.fill('')
  await locator.pressSequentially(text, { delay: 70 + Math.floor(Math.random() * 80) })
}

async function waitForCode(context) {
  const started = Date.now()
  while (Date.now() - started < TIMEOUT_CODE) {
    if (await loggedIn(context)) return 'LOGGED_IN'
    if (fs.existsSync(CODE_FILE)) {
      const code = fs.readFileSync(CODE_FILE, 'utf8').replace(/\D/g, '')
      fs.rmSync(CODE_FILE, { force: true })
      if (code) return code
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return null
}

async function loggedIn(context) {
  const cookies = await context.cookies('https://www.instagram.com')
  return cookies.some((c) => c.name === 'sessionid' && c.value)
}

async function hasVisible(page, locator) {
  try {
    return (await locator.count()) > 0 && (await locator.first().isVisible())
  } catch {
    return false
  }
}

const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
})

let closing = false
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (closing) return
    closing = true
    setState('stopped', 'Stopped by signal')
    await context.close().catch(() => {})
    process.exit(0)
  })
}

const page = context.pages()[0] || (await context.newPage())
setState('opening', 'Chrome opened')

const userField = page.locator('input[name="email"], input[name="username"]').first()
const passField = page.locator('input[name="pass"], input[name="password"]').first()

const codeInput = () =>
  page
    .locator('input:visible:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])')
    .first()

try {
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(1200)

  for (const text of ['Allow all cookies', 'Allow essential cookies', 'Decline optional cookies']) {
    const button = page.getByRole('button', { name: text }).first()
    if (await hasVisible(page, button)) {
      await button.click().catch(() => {})
      await pause(page, 400, 900)
      break
    }
  }

  if (await loggedIn(context)) {
    await context.storageState({ path: STATE_FILE })
    fs.rmSync(LOCK_FILE, { force: true })
    setState('ok', 'Already logged in; session saved')
    await context.close()
    process.exit(0)
  }

  setState('login', manual ? 'Waiting for manual login' : 'Filling the login form')

  if (manual) {
    setState('needs_human', 'Manual login: type the password in the Chrome window')
  } else if (!username || !password) {
    setState('needs_human', `${envPrefix}_PASSWORD is missing; log in manually in the Chrome window`)
  } else {
    await userField.waitFor({ state: 'visible', timeout: 45_000 })
    await typeLikeHuman(page, userField, username)
    await pause(page, 500, 1100)

    await passField.waitFor({ state: 'visible', timeout: 15_000 })
    await typeLikeHuman(page, passField, password)
    await pause(page, 600, 1300)

    const loginButton = page.getByRole('button', { name: /^log in$/i }).first()
    if (await hasVisible(page, loginButton)) await loginButton.click()
    else await passField.press('Enter')

    setState('submitted', 'Credentials submitted')
  }

  const started = Date.now()
  let lastShot = 0
  let codeAttempts = 0
  let authSelected = false
  while (Date.now() - started < TIMEOUT_TOTAL) {
    await page.waitForTimeout(2000)

    if (Date.now() - lastShot > 8000) {
      lastShot = Date.now()
      await page.screenshot({ path: shot('login-live') }).catch(() => {})
    }

    if (await loggedIn(context)) break

    const url = page.url()

    const twoFactorPrompt = page.getByText(/try another way/i).first()
    const tryAnotherButton = page.getByRole('button', { name: /try another way/i }).first()
    const onTwoFactor = url.includes('two_factor') || (await twoFactorPrompt.isVisible().catch(() => false))
    if (!manual && onTwoFactor) {
      if (codeAttempts >= 3) {
        block('2FA code was rejected three times')
        setState('error', '2FA failed three times; stopped')
        await page.screenshot({ path: shot('login-error') }).catch(() => {})
        process.exit(2)
      }
      codeAttempts += 1

      if (useAuthenticator && !authSelected) {
        await twoFactorPrompt.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {})
        await pause(page, 500, 900)

        for (let attempt = 0; attempt < 2; attempt += 1) {
          const trigger = (await hasVisible(page, tryAnotherButton)) ? tryAnotherButton : twoFactorPrompt
          if (await hasVisible(page, trigger)) {
            await trigger.click().catch(() => {})
            await pause(page, 1500, 2200)
          }
          if (await page.getByRole('dialog').first().isVisible().catch(() => false)) break
        }

        const dialog = page.getByRole('dialog').first()
        await dialog.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
        const dialogVisible = await dialog.isVisible().catch(() => false)
        const scope = dialogVisible ? dialog : page

        const authOption = scope
          .getByText(/authentication app|authenticator app|authenticator|اپلیکیشن احراز هویت|برنامه احراز هویت/i)
          .first()
        await authOption.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {})

        const pickedAuthenticator = await hasVisible(page, authOption)
        if (pickedAuthenticator) {
          await authOption.click()
          await pause(page, 900, 1500)

          const proceed = page.getByRole('button', { name: /^continue$/i }).first()
          if (await hasVisible(page, proceed)) {
            await proceed.click()
            await pause(page, 1200, 2000)
          }
        }

        authSelected = true
        await page.screenshot({ path: shot('2fa-screen') }).catch(() => {})

        if (!pickedAuthenticator) {
          setState('error', 'Could not find the authenticator option in the 2FA dialog')
          await page.screenshot({ path: shot('login-error') }).catch(() => {})
          process.exit(2)
        }
      }

      const box = codeInput()
      await box.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {})
      if (!(await box.isVisible().catch(() => false))) {
        setState('error', 'The security-code field did not appear')
        await page.screenshot({ path: shot('login-error') }).catch(() => {})
        process.exit(2)
      }

      setState('needs_2fa', `Instagram asked for the security code (attempt ${codeAttempts} of 3)`)
      const code = await waitForCode(context)
      if (code === 'LOGGED_IN') break
      if (!code) {
        setState('error', 'No 2FA code within 5 minutes')
        await page.screenshot({ path: shot('login-error') }).catch(() => {})
        process.exit(2)
      }
      await typeLikeHuman(page, box, code)
      await pause(page, 400, 800)
      const confirm = page.getByRole('button', { name: /^(next|confirm|submit|continue)$/i }).first()
      if (await hasVisible(page, confirm)) await confirm.click()
      else await box.press('Enter')
      setState('submitted', '2FA code submitted')
      await page.waitForTimeout(3000)
      if (await loggedIn(context)) break
      continue
    }

    if (url.includes('/challenge')) {
      setState('needs_human', 'Instagram checkpoint; solve it in the Chrome window')
      await page.screenshot({ path: shot('login-challenge') }).catch(() => {})
      continue
    }

    const alert = page.locator('[role="alert"]').first()
    if (await hasVisible(page, alert)) {
      const text = ((await alert.innerText().catch(() => '')) || '').trim()
      if (/incorrect|wrong|invalid|not match|نادرست|اشتباه/i.test(text)) {
        block('Instagram rejected the login information')
        setState('error', text)
        await page.screenshot({ path: shot('login-error') }).catch(() => {})
        process.exit(2)
      }
    }

    if (Date.now() - started > 15_000 && lastState === 'submitted') {
      const body = (await page.textContent('body').catch(() => '')) || ''
      if (/login information you entered is incorrect|incorrect|wrong password|invalid password|نادرست|اشتباه/i.test(body)) {
        block('Instagram rejected the login information')
        setState('error', 'Instagram rejected the login information (wrong password); stopped, no retry')
        await page.screenshot({ path: shot('login-error') }).catch(() => {})
        process.exit(2)
      }
    }

    if (Date.now() - started > 30_000 && lastState === 'submitted') {
      setState('needs_human', 'Instagram is not responding; check the Chrome window')
    }
  }

  if (!(await loggedIn(context))) {
    setState('error', 'Login did not complete within 15 minutes')
    await page.screenshot({ path: shot('login-error') }).catch(() => {})
    process.exit(2)
  }

  for (let i = 0; i < 3; i++) {
    const notNow = page.getByRole('button', { name: /not now/i }).first()
    if (!(await hasVisible(page, notNow))) break
    await notNow.click().catch(() => {})
    await pause(page, 800, 1600)
  }

  await context.storageState({ path: STATE_FILE })
  fs.rmSync(LOCK_FILE, { force: true })
  setState('ok', 'Logged in; session saved')
  await context.close()
  process.exit(0)
} catch (error) {
  if (/has been closed|Target closed|Browser has been closed/i.test(error.message)) {
    setState('closed', 'Chrome window was closed before login finished')
  } else {
    setState('error', error.message)
    await page.screenshot({ path: shot('login-error') }).catch(() => {})
  }
  await context.close().catch(() => {})
  process.exit(2)
}
