import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const STATUS = path.join(RUNTIME, 'meta-suite.json')
const CODE_FILE = path.join(RUNTIME, 'meta-2fa.txt')
const STATE_FILE = path.join(RUNTIME, 'meta-state.json')
const LOCK_FILE = path.join(RUNTIME, 'meta-blocked.json')
const TIMEOUT_CODE = 5 * 60_000
const TIMEOUT_TOTAL = 15 * 60_000

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

const phone = (process.env.FB_PHONE || '').trim()
const password = process.env.FB_PASSWORD || ''
const manual = process.argv.includes('--manual')
const keepOpen = process.argv.includes('--keep-open')
const profileDir =
  process.env.IG_PROFILE_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), 'rozetext', 'chrome-profile')

fs.mkdirSync(RUNTIME, { recursive: true })
fs.rmSync(CODE_FILE, { force: true })

if (fs.existsSync(LOCK_FILE) && !process.argv.includes('--force') && !manual) {
  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'))
  console.log(`meta login blocked at ${lock.at}: ${lock.reason}. Fix FB_PASSWORD, then run once with --force.`)
  process.exit(3)
}

let lastState = ''
function setState(state, message = '') {
  if (state === lastState) return
  lastState = state
  fs.writeFileSync(STATUS, JSON.stringify({ state, message, pid: process.pid, updated_at: new Date().toISOString() }, null, 2))
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

async function waitForCode() {
  const started = Date.now()
  while (Date.now() - started < TIMEOUT_CODE) {
    if (fs.existsSync(CODE_FILE)) {
      const code = fs.readFileSync(CODE_FILE, 'utf8').replace(/\D/g, '')
      fs.rmSync(CODE_FILE, { force: true })
      if (code) return code
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return null
}

async function fbLoggedIn(context) {
  const cookies = await context.cookies('https://www.facebook.com')
  return cookies.some((c) => c.name === 'c_user' && c.value)
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

let page = context.pages()[0] || (await context.newPage())
setState('opening', 'Chrome opened')

let emailField = page.locator('input[name="email"]').first()
let passField = page.locator('input[name="pass"]').first()
let codeField = page.locator('input[name="approvals_code"], input[autocomplete="one-time-code"]').first()

function bindLocators() {
  emailField = page.locator('input[name="email"]').first()
  passField = page.locator('input[name="pass"]').first()
  codeField = page.locator('input[name="approvals_code"], input[autocomplete="one-time-code"]').first()
}

try {
  await page.goto('https://business.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(2500)

  const cookieDeadline = Date.now() + 12_000
  while (Date.now() < cookieDeadline) {
    let clicked = false
    for (const text of ['Allow all cookies', 'Only allow essential cookies', 'Decline optional cookies', 'Accept all']) {
      const button = page.getByRole('button', { name: text }).first()
      if (await hasVisible(page, button)) {
        await button.click().catch(() => {})
        await pause(page, 500, 900)
        clicked = true
        break
      }
    }
    if (clicked) break
    await page.waitForTimeout(800)
  }

  if (await fbLoggedIn(context)) {
    await context.storageState({ path: STATE_FILE })
    fs.rmSync(LOCK_FILE, { force: true })
    setState('ok', 'Already logged in; session saved')
    await page.screenshot({ path: path.join(RUNTIME, 'meta-suite.png') }).catch(() => {})
  } else {
    setState('login', manual ? 'Waiting for manual login' : 'Opening the Facebook login form')

    if (manual) {
      setState('needs_human', 'Manual login: sign in with Facebook in the Chrome window')
    } else {
      if (!(await emailField.isVisible().catch(() => false))) {
        const fbCta = page
          .getByRole('button', { name: /continue with facebook/i })
          .or(page.getByRole('link', { name: /continue with facebook/i }))
          .or(page.getByText('Continue with Facebook', { exact: true }))
          .first()

        if (await hasVisible(page, fbCta)) {
          const popupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null)
          await fbCta.click().catch(() => {})
          const popup = await popupPromise
          await pause(page, 1500, 2500)
          if (popup) page = popup
          else {
            const pages = context.pages()
            if (pages.length > 1) page = pages[pages.length - 1]
          }
          await page.waitForLoadState('domcontentloaded').catch(() => {})
          bindLocators()
        }
      }

      await emailField.waitFor({ state: 'visible', timeout: 45_000 }).catch(() => {})
      if (!(await emailField.isVisible().catch(() => false))) {
        setState('needs_human', 'Login form not found; sign in with Facebook in the Chrome window')
      } else {
        await typeLikeHuman(page, emailField, phone)
        await pause(page, 500, 1100)
        await typeLikeHuman(page, passField, password)
        await pause(page, 600, 1300)

        const submit = page.locator('button[name="login"], button[type="submit"]').first()
        if (await hasVisible(page, submit)) await submit.click()
        else await passField.press('Enter')
        setState('submitted', 'Credentials submitted')
      }
    }

    const started = Date.now()
    let codeAttempts = 0
    let lastShot = 0

    while (Date.now() - started < TIMEOUT_TOTAL) {
      await page.waitForTimeout(2000)

      if (Date.now() - lastShot > 8000) {
        lastShot = Date.now()
        await page.screenshot({ path: path.join(RUNTIME, 'meta-suite-live.png'), timeout: 5000 }).catch(() => {})
      }

      if (await fbLoggedIn(context)) break

      const fbCookies = await context.cookies('https://www.facebook.com').catch(() => [])
      if (fbCookies.some((c) => c.name === 'checkpoint')) {
        setState('needs_human', 'Facebook checkpoint; complete it in the Chrome window')
        continue
      }

      const url = page.url()
      const body = (await page.textContent('body', { timeout: 5000 }).catch(() => '')) || ''

      if (await hasVisible(page, codeField)) {
        if (codeAttempts >= 3) {
          fs.writeFileSync(LOCK_FILE, JSON.stringify({ reason: '2FA failed three times', at: new Date().toISOString() }, null, 2))
          setState('error', '2FA failed three times; stopped')
          await page.screenshot({ path: path.join(RUNTIME, 'meta-suite-error.png') }).catch(() => {})
          process.exit(2)
        }
        codeAttempts += 1
        setState('needs_2fa', `Facebook asked for the security code (attempt ${codeAttempts} of 3)`)
        const code = await waitForCode()
        if (!code) {
          setState('error', 'No 2FA code within 5 minutes')
          await page.screenshot({ path: path.join(RUNTIME, 'meta-suite-error.png') }).catch(() => {})
          process.exit(2)
        }
        await typeLikeHuman(page, await codeField, code)
        await pause(page, 400, 800)
        const confirm = page.locator('button[type="submit"], button[name="login"]').first()
        if (await hasVisible(page, confirm)) await confirm.click()
        else await codeField.press('Enter')
        setState('submitted', '2FA code submitted')
        await page.waitForTimeout(3000)
        if (await fbLoggedIn(context)) break
        continue
      }

      if (url.includes('/checkpoint') || /confirm your identity|we suspended|review your account/i.test(body)) {
        setState('needs_human', 'Facebook checkpoint; solve it in the Chrome window')
        continue
      }

      if (/password you entered is incorrect|incorrect password|رمز عبور.*(اشتباه|نادرست)/i.test(body)) {
        fs.writeFileSync(LOCK_FILE, JSON.stringify({ reason: 'Facebook rejected the password', at: new Date().toISOString() }, null, 2))
        setState('error', 'Facebook rejected the password; stopped, no retry')
        await page.screenshot({ path: path.join(RUNTIME, 'meta-suite-error.png') }).catch(() => {})
        process.exit(2)
      }
    }

    if (!(await fbLoggedIn(context))) {
      setState('error', 'Login did not complete within 15 minutes')
      await page.screenshot({ path: path.join(RUNTIME, 'meta-suite-error.png') }).catch(() => {})
      process.exit(2)
    }

    await context.storageState({ path: STATE_FILE })
    fs.rmSync(LOCK_FILE, { force: true })
    setState('ok', 'Logged in; session saved')
    await page.screenshot({ path: path.join(RUNTIME, 'meta-suite.png') }).catch(() => {})
  }

  if (keepOpen) {
    console.log('KEEP_OPEN: close with runtime/close-meta.txt or 15 minutes')
    const closeFile = path.join(RUNTIME, 'close-meta.txt')
    fs.rmSync(closeFile, { force: true })
    const started = Date.now()
    while (Date.now() - started < 15 * 60_000 && !fs.existsSync(closeFile)) {
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
} catch (error) {
  fs.writeFileSync(
    STATUS,
    JSON.stringify({ state: 'error', message: error.message, pid: process.pid, updated_at: new Date().toISOString() }, null, 2),
  )
  await page.screenshot({ path: path.join(RUNTIME, 'meta-suite-error.png') }).catch(() => {})
  process.exitCode = 2
} finally {
  await context.close().catch(() => {})
}
