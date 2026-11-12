import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const EXPORTS = path.join(ROOT, 'data', 'exports')
const STATUS = path.join(RUNTIME, 'meta-export.json')
const START_YEAR = 2026
const START_MONTH = 'August'
const START_DAY = 1
const today = new Date()
const TODAY_MONTH = today.toLocaleString('en-US', { month: 'long' })
const TODAY_DAY = today.getDate()
const TODAY_YEAR = today.getFullYear()
const TODAY_LABEL = `${TODAY_MONTH} ${TODAY_DAY}, ${TODAY_YEAR}`

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
const cdp = await context.newCDPSession(page).catch(() => null)
if (cdp) {
  await cdp
    .send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: EXPORTS, eventsEnabled: true })
    .catch(() => {})
}
const wait = (min, max) => page.waitForTimeout(min + Math.floor(Math.random() * Math.max(1, max - min)))

async function openExportPanel() {
  const arrow = page.getByText('Open export options', { exact: true }).first()
  if (await arrow.isVisible().catch(() => false)) {
    await arrow.click({ force: true }).catch(() => {})
    await page.waitForTimeout(1500)
    return true
  }
  return false
}

async function loggedIn() {
  const cookies = await context.cookies('https://www.facebook.com').catch(() => [])
  return cookies.some((c) => c.name === 'c_user' && c.value)
}

try {
  setState('opening')
  await page.goto('https://business.facebook.com/latest/posts', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await wait(5000, 7000)

  if (!(await loggedIn())) {
    setState('needs_session', {
      message: 'No Facebook session. Export cookies to runtime/fb-cookies.json and run node scripts/meta-import-cookies.mjs, then rerun.',
    })
    process.exit(3)
  }

  await page.getByText('Export data', { exact: true }).first().click()
  await wait(2500, 3500)

  const dialog = page.getByRole('dialog').first()
  await dialog.getByText('Instagram', { exact: true }).first().click()
  await wait(1000, 1600)

  await dialog.getByRole('combobox').first().click()
  await wait(1000, 1500)
  await page.getByRole('option').filter({ hasText: 'rozetext.ir' }).first().click({ force: true })
  await wait(800, 1200)
  await dialog.getByRole('combobox').first().click({ force: true })
  await wait(600, 1000)

  await dialog.getByText(/2026/).filter({ hasText: /–|-/ }).first().click({ force: true })
  await wait(1500, 2000)

  const previous = page.getByRole('button', { name: /previous month/i }).first()
  const next = page.getByRole('button', { name: /next month/i }).first()

  for (let i = 0; i < 12; i += 1) {
    if (await page.getByText(`${START_MONTH} ${START_YEAR}`, { exact: true }).first().isVisible().catch(() => false)) break
    await previous.click({ force: true })
    await wait(700, 1000)
  }

  const startDay = page.getByRole('button', { name: new RegExp(`${START_DAY} ${START_MONTH} ${START_YEAR}`) }).first()
  await startDay.click({ force: true })
  await wait(800, 1200)

  for (let i = 0; i < 12; i += 1) {
    if (await page.getByText(`${TODAY_MONTH} ${TODAY_YEAR}`, { exact: true }).first().isVisible().catch(() => false)) break
    await next.click({ force: true })
    await wait(700, 1000)
  }

  const endDay = page.getByRole('button', { name: new RegExp(`${TODAY_DAY} ${TODAY_MONTH} ${TODAY_YEAR}`) }).first()
  await endDay.click({ force: true })
  await wait(800, 1200)

  const update = page.getByRole('button', { name: /^update$/i }).first()
  await update.click({ force: true })
  await wait(1200, 1800)

  const rangeLabel = `${START_MONTH.slice(0, 3)} ${START_DAY} - ${TODAY_MONTH.slice(0, 3)} ${TODAY_DAY}`
  const rows = page.getByRole('menuitem').filter({ hasText: new RegExp(rangeLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
  const rowsBefore = await rows.count().catch(() => 0)

  const generate = page.getByRole('button', { name: /^generate$/i }).first()
  await generate.click({ force: true })
  await wait(4000, 5000)
  setState('generated', { range: `${START_MONTH} ${START_DAY}, ${START_YEAR} - ${TODAY_LABEL}` })

  const newRowDeadline = Date.now() + 60_000
  while (Date.now() < newRowDeadline) {
    if ((await rows.count().catch(() => 0)) > rowsBefore) break
    await page.waitForTimeout(3000)
  }

  let ready = false
  const deadline = Date.now() + 10 * 60_000
  let lastRefresh = Date.now()
  while (Date.now() < deadline) {
    const firstRow = rows.first()
    const rowText = await firstRow.innerText().catch(() => '')
    if (/Completed/i.test(rowText) && /100%/.test(rowText)) {
      ready = true
      break
    }

    if (Date.now() - lastRefresh >= 45_000) {
      lastRefresh = Date.now()
      setState('refreshing', { message: 'reloading the export panel to update the percentage' })
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {})
      await page.waitForTimeout(8000)
      await openExportPanel()
      continue
    }

    await page.waitForTimeout(10000)
  }

  if (!ready) {
    setState('needs_download', { message: 'Export did not reach 100% within 10 minutes; check Recent exports in the open window.' })
    process.exitCode = 4
  } else {
    const row = rows.first()
    const icon = row.locator('svg').first()
    const box = await icon.boundingBox().catch(() => null)
    const before = new Set(fs.readdirSync(EXPORTS))
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

    let downloaded = null
    for (let i = 0; i < 48; i += 1) {
      await page.waitForTimeout(2500)
      const created = fs
        .readdirSync(EXPORTS)
        .filter((name) => !before.has(name) && !name.endsWith('.crdownload') && !name.endsWith('.tmp'))
      if (created.length) {
        const candidate = path.join(EXPORTS, created[0])
        const size1 = fs.statSync(candidate).size
        await page.waitForTimeout(1500)
        const size2 = fs.statSync(candidate).size
        if (size1 > 0 && size1 === size2) {
          downloaded = candidate
          break
        }
      }
    }

    if (downloaded) {
      setState('downloaded', { file: path.relative(ROOT, downloaded), bytes: fs.statSync(downloaded).size })
    } else {
      setState('needs_download', { message: 'Export is ready but the browser did not start a file download; click the download icon once.' })
      process.exitCode = 4
    }
  }
} catch (error) {
  setState('error', { message: error.message })
  process.exitCode = 2
} finally {
  await context.close().catch(() => {})
}
