import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const EXPORTS = path.join(ROOT, 'data', 'exports', 'insights')
const STATUS = path.join(RUNTIME, 'meta-insights.json')
const CHARTS = ['views', 'reach', 'content-interactions', 'link-clicks']

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

fs.mkdirSync(EXPORTS, { recursive: true })

function setState(state, detail = {}) {
  fs.writeFileSync(STATUS, JSON.stringify({ state, ...detail, updated_at: new Date().toISOString() }, null, 2))
  console.log(JSON.stringify({ state, ...detail }))
}

const profileDir = process.env.IG_PROFILE_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), 'rozetext', 'chrome-profile')
const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  acceptDownloads: true,
  args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
})
const page = context.pages()[0] || (await context.newPage())
const cdp = await context.newCDPSession(page)
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: EXPORTS, eventsEnabled: true })
const wait = (min, max) => page.waitForTimeout(min + Math.floor(Math.random() * Math.max(1, max - min)))

async function loggedIn() {
  const cookies = await context.cookies('https://www.facebook.com').catch(() => [])
  return cookies.some((c) => c.name === 'c_user' && c.value)
}

async function waitForNewFile(before) {
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(1000)
    const created = fs
      .readdirSync(EXPORTS)
      .filter((name) => !before.has(name) && !name.endsWith('.crdownload') && !name.endsWith('.tmp'))
    if (created.length) {
      const file = path.join(EXPORTS, created[0])
      const size1 = fs.statSync(file).size
      await page.waitForTimeout(1200)
      if (size1 > 0 && size1 === fs.statSync(file).size) return file
    }
  }
  return null
}

try {
  setState('opening')
  await page.goto('https://business.facebook.com/latest/insights/results', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await wait(5000, 7000)

  if (!(await loggedIn())) {
    setState('needs_session', { message: 'No Facebook session. Import cookies first.' })
    process.exit(3)
  }

  await page.getByText('Facebook', { exact: true }).first().click({ force: true })
  await wait(1200, 1800)
  await page.getByText('Instagram', { exact: true }).first().click({ force: true })
  await wait(8000, 10000)

  const entity = (await page.locator('body').innerText().catch(() => '')).split('\n').slice(0, 8).join(' ')
  if (!/Instagram/.test(entity)) {
    setState('error', { message: 'Instagram entity was not selected on the Results page' })
    process.exit(2)
  }

  const exportButtons = page.getByText('Export', { exact: true })
  const count = await exportButtons.count()
  if (count < CHARTS.length) {
    setState('error', { message: `Expected ${CHARTS.length} chart export buttons, found ${count}` })
    process.exit(2)
  }

  const files = []
  for (let i = 0; i < CHARTS.length; i += 1) {
    const before = new Set(fs.readdirSync(EXPORTS))
    await exportButtons.nth(i).click({ force: true })
    await wait(600, 1000)

    const csvItem = page.getByRole('menuitem', { name: /export as csv/i }).first()
    if (!(await csvItem.isVisible().catch(() => false))) {
      setState('error', { message: `CSV option missing for chart ${i + 1}` })
      process.exit(2)
    }
    await csvItem.click({ force: true })

    const file = await waitForNewFile(before)
    if (!file) {
      setState('error', { message: `No CSV downloaded for chart ${i + 1} (${CHARTS[i]})` })
      process.exit(2)
    }

    const target = path.join(EXPORTS, `insights-${CHARTS[i]}.csv`)
    fs.copyFileSync(file, target)
    fs.rmSync(file, { force: true })
    files.push({ chart: CHARTS[i], file: path.relative(ROOT, target), bytes: fs.statSync(target).size })
    setState('chart-exported', { chart: CHARTS[i], files })
    await wait(1200, 2200)
  }

  setState('done', { files })
} catch (error) {
  setState('error', { message: error.message })
  process.exitCode = 2
} finally {
  await context.close().catch(() => {})
}
