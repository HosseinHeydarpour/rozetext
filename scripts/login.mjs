import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const STATUS = path.join(RUNTIME, 'login.json')
const CODE_FILE = path.join(RUNTIME, '2fa.txt')
const TIMEOUT_2FA = 5 * 60_000
const TIMEOUT_TOTAL = 15 * 60_000

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

const username = (process.env.IG_USERNAME || '').trim()
const password = process.env.IG_PASSWORD || ''
const profileDir =
  process.env.IG_PROFILE_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), 'rozetext', 'chrome-profile')

function status(state, message = '') {
  fs.mkdirSync(RUNTIME, { recursive: true })
  fs.writeFileSync(STATUS, JSON.stringify({ state, message, pid: process.pid, updated_at: new Date().toISOString() }, null, 2))
  console.log(`[${state}] ${message}`)
}

async function waitForCode() {
  const started = Date.now()
  while (Date.now() - started < TIMEOUT_2FA) {
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

async function clickFirst(page, selectors) {
  for (const selector of selectors) {
    const el = page.locator(selector).first()
    if (await el.count()) {
      try {
        await el.click({ timeout: 2000 })
        return true
      } catch {}
    }
  }
  return false
}

async function fillFirst(page, selectors, value) {
  for (const selector of selectors) {
    const el = page.locator(selector).first()
    if (await el.count()) {
      try {
        await el.fill(value)
        return true
      } catch {}
    }
  }
  return false
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
    status('stopped', 'Stopped by signal')
    await context.close().catch(() => {})
    process.exit(0)
  })
}


const page = context.pages()[0] || (await context.newPage())
status('opening', 'Chrome opened')

try {
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(3000)

  // cookie banner
  await clickFirst(page, [
    'button:has-text("Allow all cookies")',
    'button:has-text("Allow essential cookies")',
    'button:has-text("Decline optional cookies")',
  ])

  if (await loggedIn(context)) {
    await context.storageState({ path: path.join(RUNTIME, 'ig-state.json') })
    status('ok', 'Already logged in; session saved')
    await context.close()
    process.exit(0)
  }

  status('login', 'Opening the login form')

  if (!username || !password) {
    status('needs_human', 'IG_PASSWORD is missing; log in manually in the Chrome window')
  } else {
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const userFilled = await fillFirst(page, ['input[name="username"]', 'input[aria-label*="username" i]'], username)
    const passFilled = await fillFirst(page, ['input[name="password"]', 'input[aria-label*="password" i]'], password)
    if (!userFilled || !passFilled) {
      status('needs_human', 'Login form not found; log in manually in the Chrome window')
    } else {
      await clickFirst(page, ['button[type="submit"]', 'div[role="button"]:has-text("Log in")'])
      status('submitted', 'Credentials submitted')
    }
  }

  const started = Date.now()
  while (Date.now() - started < TIMEOUT_TOTAL) {
    await page.waitForTimeout(2500)

    if (await loggedIn(context)) break

    const url = page.url()
    const body = await page.textContent('body').catch(() => '')

    if (url.includes('two_factor') || (await page.locator('input[name="verificationCode"], input[name="security_code"]').count())) {
      status('needs_2fa', 'Instagram asked for the security code')
      const code = await waitForCode()
      if (!code) {
        status('error', 'No 2FA code within 5 minutes')
        await page.screenshot({ path: path.join(RUNTIME, 'login-error.png') })
        process.exit(2)
      }
      await fillFirst(page, ['input[name="verificationCode"]', 'input[name="security_code"]', 'input[aria-label*="code" i]'], code)
      await clickFirst(page, ['button[type="submit"]', 'button:has-text("Next")', 'button:has-text("Confirm")'])
      status('submitted', '2FA code submitted')
      continue
    }

    if (url.includes('/challenge')) {
      status('needs_human', 'Instagram checkpoint; solve it in the Chrome window')
      continue
    }

    if (url.includes('/accounts/login') && /login/i.test(url)) {
      const alert = page.locator('[role="alert"]').first()
      if (await alert.count()) {
        const text = (await alert.textContent().catch(() => '')) || 'Instagram rejected the login'
        status('error', text.trim())
        await page.screenshot({ path: path.join(RUNTIME, 'login-error.png') })
        process.exit(2)
      }
    }

    if (/checkpoint|suspicious|confirm it.s you/i.test(body)) {
      status('needs_human', 'Instagram wants a confirmation in the Chrome window')
    }
  }

  if (!(await loggedIn(context))) {
    status('error', 'Login did not complete within 15 minutes')
    await page.screenshot({ path: path.join(RUNTIME, 'login-error.png') })
    process.exit(2)
  }

  await context.storageState({ path: path.join(RUNTIME, 'ig-state.json') })
  status('ok', 'Logged in; session saved')
  await context.close()
  process.exit(0)
} catch (error) {
  status('error', error.message)
  await page.screenshot({ path: path.join(RUNTIME, 'login-error.png') }).catch(() => {})
  await context.close().catch(() => {})
  process.exit(2)
}
