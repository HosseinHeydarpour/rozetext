import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const ROOT = path.resolve(import.meta.dirname, '..')
const EXPORTS = path.join(ROOT, 'data', 'exports')
const STATUS = path.join(ROOT, 'runtime', 'meta-content.json')
const POSTS_URL =
  'https://business.facebook.com/latest/posts/published_posts/?business_id=1080597847874556&asset_id=1362041750315351'

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
  args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
})
const page = context.pages()[0] || (await context.newPage())
const wait = (min, max) => page.waitForTimeout(min + Math.floor(Math.random() * Math.max(1, max - min)))

async function loggedIn() {
  const cookies = await context.cookies('https://www.facebook.com').catch(() => [])
  return cookies.some((c) => c.name === 'c_user' && c.value)
}

try {
  setState('opening')
  await page.goto(POSTS_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await wait(12000, 14000)

  if (!(await loggedIn())) {
    setState('needs_session', { message: 'No Facebook session. Import cookies first.' })
    process.exit(3)
  }

  const headers = await page
    .locator('[role="row"]')
    .first()
    .locator('[role="columnheader"]')
    .allInnerTexts()
    .catch(() => [])

  const rowCount = await page.locator('table tr').count()
  const rows = []
  for (let i = 1; i < rowCount; i += 1) {
    const row = page.locator('table tr').nth(i)
    const cells = await row.locator('[role="gridcell"], [role="rowheader"], td').allInnerTexts().catch(() => [])
    if (cells.length < 18) continue
    const titleLines = cells[1]
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^\d+:\d+$/.test(line) && !/^(Reel|Boost|Open Dropdown|rozetext\.ir)$/.test(line))
    rows.push({
      title: titleLines[0] || '',
      date_published: cells[2],
      reach: cells[4],
      views: cells[5],
      viewers: cells[6],
      follows: cells[7],
      interactions: cells[8],
      likes: cells[9],
      comments: cells[10],
      shares: cells[11],
      saves: cells[12],
      link_clicks: cells[13],
      watch_time: cells[14],
      avg_play_time: cells[15],
      three_second_views: cells[16],
      earnings: cells[17],
    })
  }

  const payload = { fetched_at: new Date().toISOString(), source: POSTS_URL, headers, rows }
  fs.writeFileSync(path.join(EXPORTS, 'content-table.json'), JSON.stringify(payload, null, 2))

  const columns = ['title', 'date_published', 'views', 'reach', 'likes', 'comments', 'shares', 'saves', 'follows', 'watch_time', 'avg_play_time', 'three_second_views']
  const csv = [columns.join(','), ...rows.map((row) => columns.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
  fs.writeFileSync(path.join(EXPORTS, 'content-table.csv'), '\ufeff' + csv)

  setState('done', {
    rows: rows.length,
    json: 'data/exports/content-table.json',
    csv: 'data/exports/content-table.csv',
  })
} catch (error) {
  setState('error', { message: error.message })
  process.exitCode = 2
} finally {
  await context.close().catch(() => {})
}
