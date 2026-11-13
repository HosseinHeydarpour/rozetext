import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Fills the empty `content` field of data/main-database/reels_database.json from reel screenshots.
// `collect` screenshots with the collector account; the agent transcribes them;
// `apply` merges runtime/reel-content/transcripts.json into the database.

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA = path.join(ROOT, 'data')
const RUNTIME = path.join(ROOT, 'runtime')
const SHOTS = path.join(RUNTIME, 'reel-shots')
const TRANSCRIPTS = path.join(RUNTIME, 'reel-content', 'transcripts.json')
const STATUS = path.join(RUNTIME, 'reel-content-update.json')
const PAGE_ACCOUNT = 'rozetext.ir'

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

const flag = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1]
const limit = Math.min(25, Math.max(1, Number(flag('limit')) || 8))
const apply = process.argv.includes('--apply')
const cleanup = process.argv.includes('--cleanup')

const collector = (process.env.IG_COLLECT_USERNAME || '').trim().replace(/^@/, '').toLowerCase()

const dbPath = path.join(DATA, 'main-database', 'reels_database.json')

function setStatus(state, detail = {}) {
  fs.mkdirSync(RUNTIME, { recursive: true })
  fs.writeFileSync(
    STATUS,
    JSON.stringify({ state, database: path.relative(ROOT, dbPath), pid: process.pid, ...detail, updated_at: new Date().toISOString() }, null, 2),
  )
  console.log(JSON.stringify({ state, ...detail }))
}

function stop(state, message, code = 1) {
  setStatus(state, { message })
  console.error(message)
  process.exit(code)
}

class Halt extends Error {
  constructor(state, message, code = 2) {
    super(message)
    this.state = state
    this.code = code
  }
}

function halt(state, message, code = 2) {
  throw new Halt(state, message, code)
}

if (!fs.existsSync(dbPath)) stop('error', 'reels database not found: data/main-database/reels_database.json')
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8').replace(/^\uFEFF/, ''))
const accountName = (flag('account') || db.active_account).trim()
const account = db.accounts?.[accountName]
if (!account?.items) stop('error', `account "${accountName}" has no items`)
const items = account.items

function save() {
  account.last_updated = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const tmp = `${dbPath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, dbPath)
}

const empty = () =>
  Object.entries(items).filter(([, item]) => item.url && !String(item.content ?? '').trim())

if (cleanup) {
  fs.rmSync(SHOTS, { recursive: true, force: true })
  fs.rmSync(TRANSCRIPTS, { force: true })
  setStatus('ok', { message: 'screenshots and transcripts removed' })
  process.exit(0)
}

if (apply) {
  if (!fs.existsSync(TRANSCRIPTS)) stop('error', `transcripts not found: ${path.relative(ROOT, TRANSCRIPTS)}`)
  let transcripts
  try {
    transcripts = JSON.parse(fs.readFileSync(TRANSCRIPTS, 'utf8').replace(/^\uFEFF/, ''))
  } catch (error) {
    stop('error', `transcripts are not valid JSON: ${error.message}`)
  }
  let applied = 0
  let skipped = 0
  for (const [code, text] of Object.entries(transcripts)) {
    const item = items[code]
    const value = String(text ?? '').trim()
    if (!item || !value || String(item.content ?? '').trim()) {
      skipped += 1
      continue
    }
    item.content = value
    applied += 1
  }
  if (applied) save()
  if (applied) {
    fs.rmSync(SHOTS, { recursive: true, force: true })
    fs.rmSync(TRANSCRIPTS, { force: true })
  }
  setStatus('ok', { applied, skipped, remaining: empty().length })
  process.exit(0)
}

if (!collector) stop('error', 'IG_COLLECT_USERNAME is missing; run rozetext-data-collect-account-login')
if (collector === PAGE_ACCOUNT) stop('error', `IG_COLLECT_USERNAME points at the page account (${PAGE_ACCOUNT}); refusing to run`)
if (!empty().length) {
  setStatus('no_work', { remaining: 0 })
  process.exit(3)
}

const mainProfile =
  process.env.IG_PROFILE_DIR ||
  path.join(process.env.LOCALAPPDATA || os.homedir(), 'rozetext', 'chrome-profile')
const profileDir = process.env.IG_COLLECT_PROFILE_DIR || `${mainProfile}-collect`
const samePath = (a, b) => {
  const [x, y] = [path.resolve(a), path.resolve(b)]
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y
}
if (samePath(profileDir, mainProfile)) {
  stop('error', 'IG_COLLECT_PROFILE_DIR resolves to the page profile; refusing to run')
}

const pause = (page, min = 500, max = 1200) =>
  page.waitForTimeout(min + Math.floor(Math.random() * Math.max(1, max - min)))

async function currentUsername(page) {
  return page.evaluate(() => {
    const profile = [...document.querySelectorAll('a[href]')].find(
      (a) =>
        /^\/[A-Za-z0-9._]+\/$/.test(a.getAttribute('href')) &&
        a.querySelector('img[alt$="profile picture"]'),
    )
    return profile ? profile.getAttribute('href').replaceAll('/', '') : null
  })
}

async function dismiss(page) {
  for (const text of ['Allow all cookies', 'Allow essential cookies', 'Decline optional cookies']) {
    const button = page.getByRole('button', { name: text }).first()
    if ((await button.count()) && (await button.isVisible().catch(() => false))) {
      await button.click().catch(() => {})
      await pause(page, 400, 900)
      break
    }
  }
}

const blocked = (url, body) =>
  /\/challenge|\/checkpoint/i.test(url) ||
  /Please wait a few minutes|We restrict certain activity|Try again later|Help us confirm|suspended/i.test(body)

const missing = (response, body) =>
  response?.status() === 404 ||
  /Sorry, this page isn't available|Page Not Found|Reel unavailable|Video unavailable|This post is no longer available|صفحه.*در دسترس نیست|این ریل.*در دسترس نیست/i.test(body)

fs.mkdirSync(SHOTS, { recursive: true })
const manifestPath = path.join(SHOTS, 'manifest.json')
let manifest = []
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
} catch {}
if (!Array.isArray(manifest)) manifest = []
manifest = manifest.filter(
  (entry) => items[entry.code] && !String(items[entry.code].content ?? '').trim() && entry.shots?.some((shot) => fs.existsSync(path.join(ROOT, shot))),
)

const pending = new Set(manifest.map((entry) => entry.code))
const targets = empty()
  .filter(([code]) => !pending.has(code))
  .map(([code, item]) => ({ code, url: item.url, date: item.date }))
  .sort(() => Math.random() - 0.5)
  .slice(0, limit)

if (!targets.length) {
  setStatus('ok', { message: 'screenshots from a previous run are waiting to be transcribed', saved: 0, pending: manifest.length, manifest: path.relative(ROOT, manifestPath) })
  process.exit(0)
}

setStatus('checking_session', { expected: collector, targets: targets.length, pending: manifest.length, remaining: empty().length })

let page
let context
let saved = 0
let failed = 0
let consecutive = 0

try {
  context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
  })
  page = context.pages()[0] || (await context.newPage())
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await pause(page, 1800, 3400)
  await dismiss(page)

  const live = await currentUsername(page)
  let liveName = live
  for (let attempt = 0; attempt < 2 && !liveName; attempt += 1) {
    await pause(page, 2000, 3200)
    liveName = await currentUsername(page)
  }
  if (liveName?.toLowerCase() === PAGE_ACCOUNT) {
    halt('error', `refusing to run: the live session is the page account (${PAGE_ACCOUNT})`)
  }
  if (liveName?.toLowerCase() !== collector) {
    await page.screenshot({ path: path.join(RUNTIME, 'reel-content-error.png') }).catch(() => {})
    halt('needs_session', `live session is ${liveName || 'logged out'}, expected collector ${collector}; run rozetext-data-collect-account-login`, 2)
  }

  for (const [index, target] of targets.entries()) {
    setStatus('collecting', { current: target.code, index: index + 1, total: targets.length, saved, failed, remaining: empty().length })

    let response
    try {
      response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    } catch (error) {
      failed += 1
      consecutive += 1
      if (consecutive >= 2) halt('error', `two navigations failed in a row: ${error.message}`)
      await pause(page, 20_000, 40_000)
      continue
    }

    await pause(page, 2200, 4200)
    await page.mouse.move(300 + Math.floor(Math.random() * 700), 200 + Math.floor(Math.random() * 450)).catch(() => {})
    await page.mouse.wheel(0, 90 + Math.floor(Math.random() * 220)).catch(() => {})
    await pause(page, 700, 1600)

    const body = (await page.textContent('body').catch(() => '')) || ''
    if (blocked(page.url(), body)) {
      await page.screenshot({ path: path.join(RUNTIME, 'reel-content-error.png') }).catch(() => {})
      halt('needs_human', 'Instagram challenge or rate limit; stop and resolve it in the collector account', 2)
    }
    if (await page.locator('input[name="username"]').first().isVisible().catch(() => false)) {
      halt('needs_session', 'collector session expired; run rozetext-data-collect-account-login', 2)
    }
    if (missing(response, body)) {
      failed += 1
      consecutive = 0
      await pause(page, 15_000, 30_000)
      continue
    }

    for (const label of ['Close', 'Not now']) {
      const button = page.locator(`svg[aria-label="${label}"], [role="button"]:has-text("${label}")`).first()
      if (await button.isVisible().catch(() => false)) {
        await button.click().catch(() => {})
        await pause(page, 500, 1100)
      }
    }

    const video = page.locator('video').first()
    await video.waitFor({ state: 'visible', timeout: 12_000 }).catch(() => {})
    const stage = (await video.count()) ? video.locator('..') : page
    await pause(page, 900, 1900)

    const shots = []
    for (const frame of [1, 2]) {
      const file = path.join(SHOTS, `${target.code}-${frame}.png`)
      const ok = await stage
        .screenshot({ path: file, timeout: 12_000 })
        .then(() => true)
        .catch(() => page.screenshot({ path: file }).then(() => true).catch(() => false))
      if (ok) shots.push(path.relative(ROOT, file).replaceAll('\\', '/'))
      await pause(page, 2200, 3600)
    }

    if (!shots.length) {
      failed += 1
      consecutive += 1
      if (consecutive >= 2) halt('error', 'two reels in a row produced no screenshot')
    } else {
      saved += 1
      consecutive = 0
      manifest = manifest.filter((entry) => entry.code !== target.code)
      manifest.push({ code: target.code, url: target.url, date: target.date || null, shots, taken_at: new Date().toISOString() })
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    }

    if (index + 1 < targets.length) {
      await pause(page, 18_000, 42_000)
      if ((index + 1) % 5 === 0) await pause(page, 90_000, 180_000)
    }
  }

  setStatus('ok', {
    saved,
    failed,
    remaining: empty().length,
    manifest: path.relative(ROOT, path.join(SHOTS, 'manifest.json')),
    transcripts: path.relative(ROOT, TRANSCRIPTS),
  })
} catch (error) {
  if (error instanceof Halt) {
    setStatus(error.state, { message: error.message, saved, failed })
    console.error(error.message)
    process.exitCode = error.code
  } else if (/has been closed|Target closed|Browser has been closed/i.test(error.message)) {
    setStatus('closed', { message: 'Chrome window was closed before the run finished', saved, failed })
  } else {
    await page?.screenshot({ path: path.join(RUNTIME, 'reel-content-error.png') }).catch(() => {})
    setStatus('error', { message: error.message, saved, failed })
    process.exitCode = 2
  }
} finally {
  await context?.close().catch(() => {})
}
