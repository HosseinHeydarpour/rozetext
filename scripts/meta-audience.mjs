import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const EXPORTS = path.join(ROOT, 'data', 'exports', 'audience')
const STATUS = path.join(RUNTIME, 'meta-audience.json')

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

async function selectInstagram() {
  const fb = page.getByText('Facebook', { exact: true }).first()
  if (await fb.isVisible().catch(() => false)) {
    await fb.click({ force: true })
    await wait(1200, 1800)
    await page.getByText('Instagram', { exact: true }).first().click({ force: true })
    await wait(7000, 9000)
  }
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

async function exportCsv(button, filename) {
  const before = new Set(fs.readdirSync(EXPORTS))
  await button.click({ force: true })
  await wait(600, 1000)

  const csvItem = page.getByRole('menuitem', { name: /export as csv/i }).first()
  if (!(await csvItem.isVisible().catch(() => false))) {
    return { error: 'CSV option missing' }
  }
  await csvItem.click({ force: true })

  const file = await waitForNewFile(before)
  if (!file) return { error: 'no file downloaded' }

  const target = path.join(EXPORTS, filename)
  fs.copyFileSync(file, target)
  fs.rmSync(file, { force: true })
  return { file: path.relative(ROOT, target), bytes: fs.statSync(target).size }
}

try {
  setState('opening')
  await page.goto('https://business.facebook.com/latest/insights/results', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await wait(5000, 7000)

  if (!(await loggedIn())) {
    setState('needs_session', { message: 'No Facebook session. Import cookies first.' })
    process.exit(3)
  }

  await selectInstagram()
  await page.getByText('Audience', { exact: true }).first().click({ force: true })
  await wait(8000, 10000)
  await selectInstagram()

  if (await page.getByText('You are currently offline').first().isVisible().catch(() => false)) {
    await page.getByText('Refresh', { exact: true }).first().click({ force: true }).catch(() => {})
    await wait(12000, 14000)
  }

  const demographicsExport = page.getByText('Export', { exact: true }).first()
  const demographics = await exportCsv(demographicsExport, 'audience-demographics.csv')
  setState('demographics', { demographics })

  await page.getByText('Trends', { exact: true }).first().click({ force: true })
  await wait(8000, 10000)
  const trendsText = (await page.locator('body').innerText().catch(() => '')).replace(/\n{3,}/g, '\n\n')
  const cleanTrends = trendsText.replace(/\u200b/g, '')
  const seriesLine = cleanTrends.split('\n').find((line) => line.startsWith('Primary\t')) || ''
  const series = seriesLine.split('\t').slice(1).map((value) => Number(value.replace(/[^\d.-]/g, ''))).filter((n) => Number.isFinite(n))
  fs.writeFileSync(
    path.join(EXPORTS, 'audience-trends.json'),
    JSON.stringify(
      {
        fetched_at: new Date().toISOString(),
        follows: cleanTrends.match(/Follows[^\d]*([\d.,K]+)\s*([\d.]+%)/)?.[1] || null,
        unfollows: cleanTrends.match(/Unfollows[^\d]*([\d.,K]+)\s*([\d.]+%)/)?.[1] || null,
        followers_lifetime: cleanTrends.match(/Followers[^\d]*Lifetime[^\d]*([\d.,]+)/)?.[1] || null,
        daily_follows: series,
        raw: trendsText.slice(0, 2000),
      },
      null,
      2,
    ),
  )
  setState('trends', { series_points: series.length })

  await page.goto('https://business.facebook.com/latest/insights/content_summary', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await wait(8000, 10000)
  await selectInstagram()

  const formatsTitle = page.getByText('Top content formats', { exact: true }).first()
  for (let i = 0; i < 12; i += 1) {
    if (await formatsTitle.isVisible().catch(() => false)) break
    await page.mouse.wheel(0, 800)
    await wait(1000, 1400)
  }
  await formatsTitle.scrollIntoViewIfNeeded().catch(() => {})
  await wait(1200, 1800)

  const formatsExport = formatsTitle.locator('xpath=following::*[normalize-space(text())="Export"][1]').first()
  const formats = (await formatsExport.count()) > 0 ? await exportCsv(formatsExport, 'top-content-formats.csv') : { error: 'export not found' }
  setState('done', { demographics, formats })
} catch (error) {
  setState('error', { message: error.message })
  process.exitCode = 2
} finally {
  await context.close().catch(() => {})
}
