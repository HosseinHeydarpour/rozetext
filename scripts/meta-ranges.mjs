import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const EXPORTS = path.join(ROOT, 'data', 'exports', 'ranges')
const STATUS = path.join(RUNTIME, 'meta-ranges.json')
const CHARTS = ['views', 'reach', 'content-interactions', 'link-clicks']
const RANGES = [
  { label: 'Yesterday', slug: 'yesterday' },
  { label: 'Last 7 days', slug: 'last-7-days' },
  { label: 'Last 28 days', slug: 'last-28-days' },
  { label: 'Last 90 days', slug: 'last-90-days' },
  { label: 'This week', slug: 'this-week' },
  { label: 'This month', slug: 'this-month' },
  { label: 'This year', slug: 'this-year' },
]

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

async function setRange(label) {
  const rangeButton = page.getByText(/Last \d+ days|Yesterday|This week|This month|This year|Lifetime/).first()
  await rangeButton.click({ force: true })
  await wait(1000, 1500)
  const option = page.getByText(label, { exact: true }).last()
  await option.click({ force: true })
  await wait(7000, 9000)
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
  if (!(await csvItem.isVisible().catch(() => false))) return { error: 'CSV option missing' }
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

  const results = {}
  for (const range of RANGES) {
    await setRange(range.label)
    const exportButtons = page.getByText('Export', { exact: true })
    if ((await exportButtons.count()) < CHARTS.length) {
      results[range.slug] = { error: `expected ${CHARTS.length} export buttons` }
      setState('range-results', { range: range.slug, result: results[range.slug] })
      continue
    }
    const files = []
    for (let i = 0; i < CHARTS.length; i += 1) {
      const result = await exportCsv(exportButtons.nth(i), `insights-${CHARTS[i]}-${range.slug}.csv`)
      files.push({ chart: CHARTS[i], ...result })
      await wait(800, 1400)
    }
    results[range.slug] = { files }
    setState('range-results', { range: range.slug, files })
  }

  await page.getByText('Audience', { exact: true }).first().click({ force: true })
  await wait(8000, 10000)
  await selectInstagram()
  await page.getByText('Trends', { exact: true }).first().click({ force: true })
  await wait(6000, 8000)

  const trends = {}
  for (const range of RANGES) {
    await setRange(range.label)
    const text = (await page.locator('body').innerText().catch(() => '')).replace(/\n{3,}/g, '\n\n')
    const clean = text.replace(/\u200b/g, '')
    const seriesLine = clean.split('\n').find((line) => line.startsWith('Primary\t')) || ''
    const series = seriesLine.split('\t').slice(1).map((value) => Number(value.replace(/[^\d.-]/g, ''))).filter((n) => Number.isFinite(n))
    const payload = {
      range: range.label,
      fetched_at: new Date().toISOString(),
      follows: clean.match(/Follows[^\d]*([\d.,K]+)\s*([\d.]+%)/)?.[1] || null,
      unfollows: clean.match(/Unfollows[^\d]*([\d.,K]+)\s*([\d.]+%)/)?.[1] || null,
      followers_lifetime: clean.match(/Followers[^\d]*Lifetime[^\d]*([\d.,]+)/)?.[1] || null,
      daily_follows: series,
      raw: text.slice(0, 2000),
    }
    const file = path.join(EXPORTS, `audience-trends-${range.slug}.json`)
    fs.writeFileSync(file, JSON.stringify(payload, null, 2))
    trends[range.slug] = { file: path.relative(ROOT, file), points: series.length }
    setState('range-trends', { range: range.slug, trends: trends[range.slug] })
  }

  await page.goto('https://business.facebook.com/latest/insights/content_summary', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await wait(8000, 10000)
  await selectInstagram()

  const formats = {}
  for (const range of RANGES) {
    await setRange(range.label)
    const title = page.getByText('Top content formats', { exact: true }).first()
    for (let i = 0; i < 12; i += 1) {
      if (await title.isVisible().catch(() => false)) break
      await page.mouse.wheel(0, 800)
      await wait(800, 1200)
    }
    await title.scrollIntoViewIfNeeded().catch(() => {})
    await wait(800, 1200)
    const exportButton = title.locator('xpath=following::*[normalize-space(text())="Export"][1]').first()
    formats[range.slug] =
      (await exportButton.count()) > 0
        ? await exportCsv(exportButton, `top-content-formats-${range.slug}.csv`)
        : { error: 'export not found' }
    setState('range-formats', { range: range.slug, formats: formats[range.slug] })
  }

  setState('done', { results, trends, formats })
} catch (error) {
  setState('error', { message: error.message })
  process.exitCode = 2
} finally {
  await context.close().catch(() => {})
}
