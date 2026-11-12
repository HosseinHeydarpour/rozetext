import { chromium } from 'playwright-core'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const DATA = path.join(ROOT, 'data')
const STATE = path.join(RUNTIME, 'dashboard-data.json')
const OUTPUT = path.join(DATA, 'insights-account.json')
const CLOSE_FILE = path.join(RUNTIME, 'close-dashboard.txt')
const RANGES = [7, 14, 30, 90]
const KEEP_OPEN = process.argv.includes('--keep-open')
const FORCE = process.argv.includes('--force')

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

fs.mkdirSync(RUNTIME, { recursive: true })
fs.mkdirSync(DATA, { recursive: true })

const now = new Date().toISOString()
if (!FORCE && fs.existsSync(STATE) && fs.existsSync(OUTPUT)) {
  const previous = JSON.parse(fs.readFileSync(STATE, 'utf8'))
  const last = previous.finished_at ? new Date(previous.finished_at).getTime() : 0
  if (Date.now() - last < 5 * 60_000) {
    console.log(JSON.stringify({ state: 'skipped', reason: 'ran less than 5 minutes ago; use --force', last: previous.finished_at }))
    process.exit(0)
  }
}

function setState(state, detail = {}) {
  fs.writeFileSync(STATE, JSON.stringify({ state, ...detail, updated_at: new Date().toISOString() }, null, 2))
  console.log(JSON.stringify({ state, ...detail }))
}

const num = (value) => (value == null ? null : Number(String(value).replace(/,/g, '')))
const grab = (text, regex) => {
  const match = text.match(regex)
  return match ? match.slice(1) : null
}

function parseAccountInsights(text) {
  const views = grab(text, /Views\n([\d,]+)\nViews\nFollowers\n([\d.]+)%\nNon-followers\n([\d.]+)%\nViewers\n([\d,]+)/)
  const interactions = grab(
    text,
    /Interactions\n([\d,]+)\nInteractions\nFollowers\n([\d.]+)%\nNon-followers\n([\d.]+)%\nAccounts engaged\n([\d,]+)/,
  )
  const profile = grab(text, /Profile\n([\d,]+)\nProfile activity\nProfile visits\n([\d,]+)/)
  const followers = grab(text, /Followers\n([\d,]+)\nTotal followers/)
  const contentViews = grab(text, /By content type[\s\S]*?Reels\nStories\n([\d.]+)%\n([\d.]+)%/)
  const contentInteractions = grab(text, /By content interactions[\s\S]*?Reels\nStories\nPosts\n([\d.]+)%\n([\d.]+)%\n([\d.]+)%/)

  const cardPattern = /(\d+(?:\.\d+)?K?)\n((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2})/g
  const cards = (section) => [...section.matchAll(cardPattern)].map((m) => ({ value: m[1], date: m[2] }))
  const viewsSection = (text.split('Top content based on views')[1] || '').split('Interactions\n')[0]
  const interactionsSection = (text.split('Top content based on interactions')[1] || '').split('Profile\n')[0]

  const activeTimes = {}
  for (const label of ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p']) {
    const found = grab(text, new RegExp(`${label}\\n([\\d,]+)`))
    if (found) activeTimes[label] = num(found[0])
  }

  return {
    views: views
      ? { total: num(views[0]), followers_pct: Number(views[1]), non_followers_pct: Number(views[2]), viewers: num(views[3]) }
      : null,
    interactions: interactions
      ? {
          total: num(interactions[0]),
          followers_pct: Number(interactions[1]),
          non_followers_pct: Number(interactions[2]),
          accounts_engaged: num(interactions[3]),
        }
      : null,
    content_views: contentViews ? { reels_pct: Number(contentViews[0]), stories_pct: Number(contentViews[1]) } : null,
    content_interactions: contentInteractions
      ? {
          reels_pct: Number(contentInteractions[0]),
          stories_pct: Number(contentInteractions[1]),
          posts_pct: Number(contentInteractions[2]),
        }
      : null,
    profile_visits: profile ? num(profile[1]) : null,
    followers_total: followers ? num(followers[0]) : null,
    top_content_views: cards(viewsSection),
    top_content_interactions: cards(interactionsSection),
    active_times: Object.keys(activeTimes).length ? { selected_day: 'M', hours: activeTimes } : null,
  }
}

async function readInsights(page) {
  const deadline = Date.now() + 30_000
  let text = ''
  while (Date.now() < deadline) {
    text = (await page.locator('main').innerText().catch(() => page.locator('body').innerText())).replace(/\n{3,}/g, '\n\n')
    if (/Viewers/.test(text) && /Accounts engaged/.test(text) && /Top content based on interactions/.test(text)) return text
    await page.mouse.wheel(0, 700).catch(() => {})
    await page.waitForTimeout(1200)
  }
  return text
}

const profileDir = process.env.IG_PROFILE_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), 'rozetext', 'chrome-profile')

setState('opening', { browser_profile: profileDir })

const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
})
const page = context.pages()[0] || (await context.newPage())
const wait = (min, max) => page.waitForTimeout(min + Math.floor(Math.random() * Math.max(1, max - min)))

const result = {
  source: 'instagram.com/accounts/insights',
  fetched_at: now,
  ranges: {},
}

try {
  await page.goto('https://www.instagram.com/rozetext.ir/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await wait(2500, 4500)

  if (page.url().includes('/accounts/login')) {
    setState('error', { message: 'session expired; run npm run login first' })
    await context.close()
    process.exit(2)
  }

  for (const range of RANGES) {
    setState(`range-${range}`, { range })

    await page.goto(`https://www.instagram.com/accounts/insights/?timeframe=${range}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await page.getByText('Account insights', { exact: true }).first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
    await wait(1500, 2500)

    const text = await readInsights(page)
    const ready = /Viewers/.test(text) && /Accounts engaged/.test(text) && /Total followers/.test(text)
    await page.mouse.wheel(0, -3000).catch(() => {})
    await wait(500, 900)

    result.ranges[range] = {
      timeframe_days: range,
      fetched_at: new Date().toISOString(),
      ready,
      parsed: parseAccountInsights(text),
      raw: text,
    }

    await page.screenshot({ path: path.join(RUNTIME, `dashboard-${range}.png`), fullPage: true }).catch(() => {})
    await wait(1800, 3600)
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2))
  setState('done', { ranges: RANGES, output: path.relative(ROOT, OUTPUT), finished_at: new Date().toISOString() })

  if (KEEP_OPEN) {
    fs.rmSync(CLOSE_FILE, { force: true })
    console.log('KEEP_OPEN: close with runtime/close-dashboard.txt or 5 minutes')
    const started = Date.now()
    while (Date.now() - started < 5 * 60_000 && !fs.existsSync(CLOSE_FILE)) {
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
} catch (error) {
  setState('error', { message: error.message })
  process.exitCode = 2
} finally {
  await context.close().catch(() => {})
}
