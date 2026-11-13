import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Read-only DM scanner by default. `--send` only sends replies the agent wrote
// into replies.json after the user approved them, and only if the thread still
// has the same last incoming message. One page account, no other writes.

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime', 'direct-admin')
const SHOTS = path.join(RUNTIME, 'shots')
const PROFILES = path.join(RUNTIME, 'profiles')
const STATUS = path.join(RUNTIME, 'run.json')
const STATE_FILE = path.join(RUNTIME, 'state.json')
const THREADS_FILE = path.join(RUNTIME, 'threads.json')
const REPLIES_FILE = path.join(RUNTIME, 'replies.json')
const PAGE_ACCOUNT = 'rozetext.ir'
const MAX_SCAN = 10
const MAX_SEND = 5
const DEFAULT_SCAN = 5
const DEFAULT_SEND = 3
const DAILY_SEND_LIMIT = 15
const HOUR_START = 10
const HOUR_END = 22
const REPLY_TTL = 24 * 3600_000
const THREAD_COOLDOWN = 20 * 3600_000

const URL_RE = /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|instagram\.com\/|wa\.me\/|whatsapp\.com\/)/i
const CONTACT_RE = /(?:\+?\d[\d\s-]{8,}\d)|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i
const PROMO_RE = [
  /(?:فالو|سیو|کامنت|لایک)\s*(?:کن|کنید|بزن|بزنید)/,
  /لینک\s*(?:در|توی|تو)\s*بایو/,
  /کد\s*تخفیف/,
  /فرصت\s*محدود/,
]
const OPT_OUT_RE = /\b(?:stop|unsubscribe)\b|لغو\s*(?:عضویت|پیام)|دیگه\s*پیام\s*(?:نده|ندید)|پیام\s*ندید/i
const UI_RE = /^(?:seen|delivered|sent|now|active now|send|ارسال|دیده شد|ارسال شد|الان|فعال|در حال تایپ)(?:\s|$)/i
const TIME_RE = /^(?:\d+\s*(?:m|h|d|w|دقیقه|ساعت|روز|هفته)|(?:\d{1,2}:\d{2})|yesterday|today|دیروز|امروز)$/i

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const has = (name) => process.argv.includes(`--${name}`)
const profileHandle = arg('profile')
const mode = has('send') ? 'send' : profileHandle ? 'profile' : has('self-test') ? 'self-test' : 'scan'
const limit = Math.max(
  1,
  Math.min(Number(arg('limit')) || (mode === 'send' ? DEFAULT_SEND : DEFAULT_SCAN), mode === 'send' ? MAX_SEND : MAX_SCAN),
)
const forceHours = has('force-hours')

const pause = (page, min = 500, max = 1200) =>
  page.waitForTimeout(min + Math.floor(Math.random() * Math.max(1, max - min)))

const norm = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
const fingerprint = (value) => crypto.createHash('sha256').update(norm(value)).digest('hex').slice(0, 12)
const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const withinHours = (date, start, end) => {
  const hour = date.getHours()
  return hour >= start && hour < end
}

const loadJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

const saveJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2))
  fs.renameSync(tmp, file)
}

const state = loadJson(STATE_FILE, { version: 1, opt_out: [], threads: {}, sent: [] })
state.opt_out = Array.isArray(state.opt_out) ? state.opt_out.map((value) => String(value).toLowerCase()) : []
state.threads = state.threads && typeof state.threads === 'object' ? state.threads : {}
state.sent = Array.isArray(state.sent) ? state.sent : []

const sentToday = () => state.sent.filter((entry) => localDate(new Date(entry.at)) === localDate()).length

class Halt extends Error {
  constructor(stateName, message, code = 2) {
    super(message)
    this.stateName = stateName
    this.code = code
  }
}

const halt = (stateName, message, code = 2) => {
  throw new Halt(stateName, message, code)
}

function setStatus(stateName, extra = {}) {
  saveJson(STATUS, {
    mode,
    state: stateName,
    ...extra,
    pid: process.pid,
    updated_at: new Date().toISOString(),
  })
  console.log(`[${stateName}] ${extra.message || ''}`.trim())
}

function replyProblem(reply, thread) {
  const text = norm(reply?.text)
  if (!text) return 'empty'
  if (text.length < 15) return 'too_short'
  if (text.length > 700) return 'too_long'
  if (text.includes(String.fromCharCode(0x2014))) return 'em_dash'
  if (URL_RE.test(text)) return 'link'
  if (CONTACT_RE.test(text)) return 'contact_info'
  if (PROMO_RE.some((pattern) => pattern.test(text))) return 'promotional'
  if (!reply?.approved_at || Number.isNaN(Date.parse(reply.approved_at))) return 'missing_approval'
  if (Date.now() - Date.parse(reply.approved_at) > REPLY_TTL) return 'approval_expired'
  if (!thread?.last_in) return 'no_incoming_message'
  if (reply.reply_to !== thread.last_in) return 'thread_changed'
  if (fingerprint(text) === thread.last_in) return 'echo'
  return null
}

function sendProblem(reply, thread) {
  if (!thread) return 'thread_not_in_scan'
  const problem = replyProblem(reply, thread)
  if (problem) return problem
  if (thread.is_group) return 'group'
  if (!thread.username) return 'unknown_username'
  const expected = String(reply.username || '').replace(/^@/, '').trim().toLowerCase()
  if (thread.username.toLowerCase() !== expected) return 'username_mismatch'
  if (state.opt_out.includes(thread.username.toLowerCase())) return 'opted_out'
  if (state.sent.some((entry) => entry.fingerprint === reply.reply_to)) return 'already_sent'
  const recent = state.threads[thread.id]?.last_reply_at
  if (recent && Date.now() - Date.parse(recent) < THREAD_COOLDOWN) return 'replied_recently'
  return null
}

function selfTest() {
  const now = new Date().toISOString()
  const emDash = String.fromCharCode(0x2014)
  const thread = { id: '1', last_in: 'abc123', username: 'someone', is_group: false }
  assert.equal(fingerprint('سلام   دنیا'), fingerprint('سلام دنیا'))
  assert.equal(withinHours(new Date('2026-11-13T10:30:00'), HOUR_START, HOUR_END), true)
  assert.equal(withinHours(new Date('2026-11-13T23:30:00'), HOUR_START, HOUR_END), false)
  assert.equal(
    replyProblem({ text: 'خیلی ممنون که این خط را فرستادی، قشنگ بود.', approved_at: now, reply_to: 'abc123' }, thread),
    null,
  )
  assert.equal(replyProblem({ text: 'کوتاه', approved_at: now, reply_to: 'abc123' }, thread), 'too_short')
  assert.equal(
    replyProblem({ text: 'این متن به اندازه کافی بلند است https://x.com', approved_at: now, reply_to: 'abc123' }, thread),
    'link',
  )
  assert.equal(
    replyProblem(
      { text: `این متن به اندازه کافی بلند است ${emDash} با خط تیره`, approved_at: now, reply_to: 'abc123' },
      thread,
    ),
    'em_dash',
  )
  assert.equal(
    replyProblem({ text: 'این متن به اندازه کافی بلند است', approved_at: '2000-01-01T00:00:00.000Z', reply_to: 'abc123' }, thread),
    'approval_expired',
  )
  assert.equal(
    replyProblem({ text: 'این متن به اندازه کافی بلند است', approved_at: now, reply_to: 'wrong' }, thread),
    'thread_changed',
  )
  assert.equal(
    replyProblem(
      { text: 'برای هماهنگی با 09121234567 تماس بگیر.', approved_at: now, reply_to: 'abc123' },
      thread,
    ),
    'contact_info',
  )
  const echoThread = { ...thread, last_in: fingerprint('این متن به اندازه کافی بلند است') }
  assert.equal(
    replyProblem(
      { text: 'این متن به اندازه کافی بلند است', approved_at: now, reply_to: echoThread.last_in },
      echoThread,
    ),
    'echo',
  )
  console.log(JSON.stringify({ ok: true, checks: 10 }))
}

if (mode === 'self-test') {
  selfTest()
  process.exit(0)
}

fs.mkdirSync(SHOTS, { recursive: true })
fs.mkdirSync(PROFILES, { recursive: true })

async function launch() {
  const mainProfile =
    process.env.IG_PROFILE_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), 'rozetext', 'chrome-profile')
  try {
    return await chromium.launchPersistentContext(mainProfile, {
      channel: 'chrome',
      headless: false,
      viewport: null,
      args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
    })
  } catch (error) {
    if (/ProcessSingleton|SingletonLock|already in use|profile.*in use/i.test(error.message)) {
      halt('profile_in_use', 'The page Chrome profile is already open. Close that window, then try again.')
    }
    throw error
  }
}

async function currentHandle(page) {
  return page.evaluate(() => {
    const profile = [...document.querySelectorAll('a[href]')].find((anchor) => {
      const href = anchor.getAttribute('href') || ''
      if (!/^\/[A-Za-z0-9._]+\/$/.test(href)) return false
      if (anchor.querySelector('img[alt$="profile picture"]')) return true
      return /profile|پروفایل/i.test(`${anchor.innerText || ''} ${anchor.getAttribute('aria-label') || ''}`)
    })
    return profile ? profile.getAttribute('href').replaceAll('/', '') : null
  })
}

async function assertAccount(page, context) {
  setStatus('checking_account', { expected: PAGE_ACCOUNT })
  const cookies = await context.cookies('https://www.instagram.com')
  if (!cookies.some((cookie) => cookie.name === 'sessionid' && cookie.value)) {
    halt('needs_session', 'The page profile is logged out. Run rozetext-login, then try again.')
  }

  await page.goto(`https://www.instagram.com/${PAGE_ACCOUNT}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await pause(page, 2000, 3600)
  await checkBlocked(page)
  if (await page.locator('input[name="username"]').first().isVisible().catch(() => false)) {
    halt('needs_session', 'Instagram is showing the login form. Run rozetext-login, then try again.')
  }

  const ownControl = page.getByText(/edit profile|ویرایش پروفایل|view archive|مشاهده آرشیو/i).first()
  await ownControl.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
  const ownProfile = await ownControl.isVisible().catch(() => false)
  const followButton = await page
    .getByRole('button', { name: /^follow$|^دنبال کردن$/i })
    .first()
    .isVisible()
    .catch(() => false)
  if (ownProfile) return
  if (followButton) halt('wrong_account', `The live session is not @${PAGE_ACCOUNT}. Stopped.`)

  let handle = null
  for (let attempt = 0; attempt < 3 && !handle; attempt += 1) {
    handle = await currentHandle(page)
    if (!handle) await pause(page, 1500, 2500)
  }
  if (!handle) {
    await page.screenshot({ path: path.join(RUNTIME, 'account-check.png') }).catch(() => {})
    halt(
      'needs_account_check',
      'Could not read the live account handle. See runtime/direct-admin/account-check.png; do not guess.',
    )
  }
  if (handle.toLowerCase() !== PAGE_ACCOUNT) {
    halt('wrong_account', `The live session is @${handle}, expected @${PAGE_ACCOUNT}. Stopped.`)
  }
}

async function dismissCookies(page) {
  for (const text of ['Allow all cookies', 'Allow essential cookies', 'Decline optional cookies']) {
    const button = page.getByRole('button', { name: text }).first()
    if ((await button.count()) && (await button.isVisible().catch(() => false))) {
      await button.click().catch(() => {})
      await pause(page, 400, 900)
      break
    }
  }
}

async function checkBlocked(page) {
  if (/\/challenge|\/checkpoint/i.test(page.url())) {
    halt('needs_human', 'Instagram checkpoint. Resolve it in the Chrome window, then stop and tell the user.')
  }
  if (/\/accounts\/login/i.test(page.url())) {
    halt('needs_session', 'The session expired. Run rozetext-login, then try again.')
  }
  const body = (await page.textContent('body').catch(() => '')) || ''
  if (
    /We restrict certain activity|Try again later|Help us confirm|suspicious activity|Action Blocked|rate limit|can.t send messages|unable to send messages|امکان ارسال پیام نیست|نمی‌توانید پیام/i.test(
      body,
    )
  ) {
    halt('needs_human', 'Instagram is blocking or rate-limiting the account. Stop and resolve it in the Chrome window.')
  }
}

const normalizePreview = (text) =>
  String(text || '')
    .replace(/\bUnread\b/gi, '')
    .replace(/·\s*\d+\s*[smhdw]?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

const isUnreadRow = (text) => /\bUnread\b/i.test(text)
const isOutgoingRow = (text) => /(?:^|\s)You:\s/i.test(text)
const inboxRows = (page) => page.locator('div[role="button"]').filter({ hasText: /(?:Unread|·\s*\d)/ })

async function dismissOverlays(page) {
  for (const text of ['Not Now', 'Not now', 'بعداً', 'حالا نه']) {
    const button = page.getByText(text, { exact: true }).first()
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => {})
      await pause(page, 800, 1500)
    }
  }
}

async function extractThread(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main[role="main"]') || document.querySelector('main') || document.body
    const composer = main.querySelector('[contenteditable="true"], textarea')
    // The composer is only in the conversation panel. Its widest tall ancestor
    // on the right is the panel, so inbox previews stay out of the messages.
    let root = null
    if (composer) {
      const composerRect = composer.getBoundingClientRect()
      for (let element = composer; element && element !== document.body; element = element.parentElement) {
        const rect = element.getBoundingClientRect()
        if (
          rect.left > window.innerWidth * 0.18 &&
          rect.left < composerRect.left + 200 &&
          rect.width < window.innerWidth * 0.9 &&
          rect.height > window.innerHeight * 0.5
        ) {
          root = element
        }
      }
    }
    root = root || main
    const box = root.getBoundingClientRect()
    const center = box.left + box.width * 0.55
    const lines = (root.innerText || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8)
    const topLink = [...root.querySelectorAll('a[href]')].find((anchor) => {
      const href = anchor.getAttribute('href') || ''
      const rect = anchor.getBoundingClientRect()
      return /^\/[A-Za-z0-9._]+\/$/.test(href) && rect.width > 0 && rect.top < box.top + 80
    })
    let username = topLink ? topLink.getAttribute('href').replaceAll('/', '') : null
    if (username && username.toLowerCase() === 'rozetext.ir') username = null
    const displayName = lines[0] && !/^\d/.test(lines[0]) ? lines[0] : null
    if (!username && lines[1] && /^[A-Za-z0-9._]{1,30}$/.test(lines[1])) username = lines[1]
    const topText = lines.join(' ')
    const isGroup = /members|people|نفر|عضو|اعضا/i.test(topText)
    const messages = []
    for (const element of root.querySelectorAll('div[dir="auto"], span[dir="auto"]')) {
      if (element.closest('[contenteditable="true"]')) continue
      if (element.querySelector('div[dir="auto"], span[dir="auto"]')) continue
      const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim()
      if (!text || text.length > 2000) continue
      if (text === username || text === displayName || text === 'rozetext.ir') continue
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) continue
      if (rect.top < box.top + 80) continue
      let direction = rect.left + rect.width / 2 > center ? 'out' : 'in'
      const row = element.closest('[role="row"]')
      if (row) direction = row.querySelector('img[alt$="profile picture"]') ? 'in' : 'out'
      messages.push({ direction, text })
    }
    return { username, displayName, isGroup, headerText: topText.slice(0, 300), messages }
  })
}

const visibleMessages = (messages) =>
  messages.filter((message) => !UI_RE.test(message.text) && !TIME_RE.test(message.text))

async function scrollToLatest(page) {
  await page.evaluate(() => {
    const root = document.querySelector('main[role="main"]') || document.querySelector('main') || document.body
    const elements = [root, ...root.querySelectorAll('*')]
    for (const element of elements) {
      if (element.scrollHeight > element.clientHeight + 40) element.scrollTop = element.scrollHeight
    }
  })
  await pause(page, 700, 1400)
}

async function currentRowText(page, thread) {
  const rows = inboxRows(page)
  const count = await rows.count()
  let fallback = null
  for (let index = 0; index < count; index += 1) {
    const text = (await rows.nth(index).innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
    if (!text) continue
    if (thread.display_name && text.includes(thread.display_name)) return text
    if (thread.username && text.toLowerCase().includes(thread.username.toLowerCase())) return text
    if (!fallback) fallback = text
  }
  return fallback
}

async function scan(page) {
  setStatus('scanning', { message: 'Opening the inbox' })
  await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await pause(page, 2500, 4500)
  await checkBlocked(page)
  await dismissOverlays(page)

  const threads = []
  const visitedIds = new Set()
  const visitedKeys = new Set()

  for (let attempt = 0; attempt < limit * 4 && threads.length < limit; attempt += 1) {
    const rows = inboxRows(page).filter({ hasText: /Unread/i })
    const count = await rows.count()
    let picked = null
    for (let index = 0; index < count; index += 1) {
      const row = rows.nth(index)
      const text = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
      if (!text) continue
      if (visitedKeys.has(normalizePreview(text))) continue
      picked = { row, text }
      break
    }
    if (!picked) break

    setStatus('scanning', {
      thread: normalizePreview(picked.text).slice(0, 80),
      index: threads.length + 1,
      total: limit,
    })
    await picked.row.click()
    await page.waitForURL(/\/direct\/t\//, { timeout: 20_000 }).catch(() => {})
    const id = page.url().match(/\/direct\/t\/([^/]+)/)?.[1]

    if (!id || visitedIds.has(id)) {
      visitedKeys.add(normalizePreview(picked.text))
      await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await pause(page, 1800, 3200)
      await dismissOverlays(page)
      continue
    }

    visitedIds.add(id)
    await pause(page, 2400, 4600)
    await checkBlocked(page)
    await scrollToLatest(page)
    const info = await extractThread(page)
    info.messages = visibleMessages(info.messages)
    const shot = path.join(SHOTS, `${id}.png`)
    await page.screenshot({ path: shot }).catch(() => {})

    const preview = normalizePreview(picked.text)
    const lastInFingerprint = fingerprint(`${id}|${preview}`)
    let skipReason = null
    if (info.isGroup) skipReason = 'group'
    else if (!info.username) skipReason = 'unknown_username'
    else if (!isUnreadRow(picked.text)) skipReason = 'not_unread'
    else if (isOutgoingRow(picked.text)) skipReason = 'last_message_is_ours'
    else if (state.opt_out.includes(info.username.toLowerCase())) skipReason = 'opted_out'
    else if (state.threads[id]?.last_reply_at && Date.now() - Date.parse(state.threads[id].last_reply_at) < THREAD_COOLDOWN) {
      skipReason = 'replied_recently'
    }

    threads.push({
      id,
      url: `https://www.instagram.com/direct/t/${id}/`,
      username: info.username,
      display_name: info.displayName,
      is_group: info.isGroup,
      messages: info.messages.slice(-20),
      preview,
      last_in: skipReason === null ? lastInFingerprint : null,
      last_message_direction: isOutgoingRow(picked.text) ? 'out' : 'in',
      has_unanswered: skipReason === null,
      skip_reason: skipReason,
      screenshot: path.relative(ROOT, shot).replaceAll('\\', '/'),
      scanned_at: new Date().toISOString(),
    })

    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await pause(page, 1800, 3200)
    await dismissOverlays(page)
  }

  if (!threads.length) {
    setStatus('no_work', { message: 'No unread threads found.' })
    return
  }

  saveJson(THREADS_FILE, { scanned_at: new Date().toISOString(), account: PAGE_ACCOUNT, threads })
  setStatus('ok', {
    scanned: threads.length,
    unanswered: threads.filter((thread) => thread.has_unanswered).length,
    file: path.relative(ROOT, THREADS_FILE).replaceAll('\\', '/'),
  })
}

function loadReplies() {
  const data = loadJson(REPLIES_FILE, null)
  if (!data) {
    halt('error', `Replies file not found: ${path.relative(ROOT, REPLIES_FILE)}. Write it after approval.`, 1)
  }
  return Array.isArray(data) ? data : Array.isArray(data.replies) ? data.replies : []
}

async function typeAndSend(page, text) {
  const composer = page.locator('[contenteditable="true"], textarea').filter({ visible: true }).last()
  await composer.waitFor({ state: 'visible', timeout: 15_000 })
  await composer.click()
  await pause(page, 300, 700)
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')

  const characters = [...norm(text)]
  for (let index = 0; index < characters.length; ) {
    const size = 1 + Math.floor(Math.random() * 3)
    await page.keyboard.type(characters.slice(index, index + size).join(''), {
      delay: 65 + Math.floor(Math.random() * 75),
    })
    index += size
    if (index % 12 < size) await pause(page, 250, 700)
  }

  await pause(page, 600, 1200)
  const draft = norm(
    await composer
      .evaluate((element) => ('value' in element ? element.value : element.innerText || element.textContent || ''))
      .catch(() => ''),
  )
  const expected = norm(text)
  const head = expected.slice(0, Math.min(12, expected.length))
  const tail = expected.slice(-10)
  if (!draft.includes(head) || !draft.includes(tail)) {
    halt('draft_mismatch', 'The composer does not contain the full approved text. Stopped before sending.')
  }

  const sendButton = page.getByRole('button', { name: /^(send|ارسال)$/i }).first()
  if (await sendButton.isVisible().catch(() => false)) await sendButton.click()
  else await page.keyboard.press('Enter')
  await pause(page, 1500, 2500)
}

async function verifySent(page, text, thread) {
  const needle = norm(text).slice(0, 12)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.waitForTimeout(2500)
    const rowText = await currentRowText(page, thread)
    if (rowText && isOutgoingRow(rowText) && normalizePreview(rowText).includes(needle)) return true
    await scrollToLatest(page)
    const info = await extractThread(page)
    const messages = visibleMessages(info.messages)
    const lastOut = [...messages].reverse().find((message) => message.direction === 'out')
    if (lastOut && norm(lastOut.text).includes(needle)) return true
  }
  return false
}

async function send(page, replies) {
  const scanData = loadJson(THREADS_FILE, null)
  if (!scanData?.threads?.length) halt('error', 'No threads.json. Run --scan first.', 1)
  const threads = new Map(scanData.threads.map((thread) => [String(thread.id), thread]))
  const valid = []
  const skipped = []

  for (const reply of replies) {
    const thread = threads.get(String(reply?.thread_id))
    const problem = sendProblem(reply, thread)
    if (problem) {
      skipped.push({ thread_id: reply?.thread_id ?? null, username: reply?.username ?? null, reason: problem })
      continue
    }
    valid.push({ reply, thread })
  }

  if (!valid.length) {
    setStatus('no_work', { skipped })
    return
  }

  const batch = valid.slice(0, limit)
  let sent = 0
  for (const [index, { reply, thread }] of batch.entries()) {
    if (sentToday() >= DAILY_SEND_LIMIT) {
      skipped.push({ thread_id: thread.id, username: thread.username, reason: 'daily_cap' })
      break
    }
    setStatus('sending', { index: index + 1, total: batch.length, username: thread.username })
    await page.goto(thread.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await pause(page, 2000, 4000)
    await checkBlocked(page)
    await dismissOverlays(page)

    const live = await extractThread(page)
    let problem = null
    if (live.isGroup) problem = 'group'
    else if (thread.username && live.username && live.username.toLowerCase() !== thread.username.toLowerCase()) {
      problem = 'wrong_thread'
    } else {
      const rowText = await currentRowText(page, thread)
      if (!rowText) problem = 'row_not_found'
      else if (fingerprint(`${thread.id}|${normalizePreview(rowText)}`) !== reply.reply_to) {
        problem = 'thread_changed'
      } else if (isOutgoingRow(rowText)) {
        problem = 'last_message_is_ours'
      } else if (OPT_OUT_RE.test(normalizePreview(rowText))) {
        if (!state.opt_out.includes(thread.username.toLowerCase())) {
          state.opt_out.push(thread.username.toLowerCase())
          saveJson(STATE_FILE, state)
        }
        problem = 'opt_out'
      }
    }

    if (problem) {
      skipped.push({ thread_id: thread.id, username: thread.username, reason: problem })
      continue
    }

    await typeAndSend(page, reply.text)
    const verified = await verifySent(page, reply.text, thread)
    const at = new Date().toISOString()
    const log = {
      thread_id: thread.id,
      username: thread.username,
      fingerprint: reply.reply_to,
      at,
      chars: norm(reply.text).length,
    }

    if (!verified) {
      state.sent.push({ ...log, status: 'unverified' })
      state.threads[thread.id] = {
        username: thread.username,
        last_reply_at: at,
        last_in: reply.reply_to,
        status: 'unverified',
      }
      saveJson(STATE_FILE, state)
      halt('unverified', `The reply to @${thread.username} was typed but not confirmed. Open the thread and check. Do not resend.`)
    }

    state.sent.push({ ...log, status: 'sent' })
    state.threads[thread.id] = {
      username: thread.username,
      last_reply_at: at,
      last_in: reply.reply_to,
      status: 'replied',
    }
    saveJson(STATE_FILE, state)
    sent += 1

    if (index + 1 < batch.length) {
      await pause(page, 45_000, 120_000)
      if ((index + 1) % 3 === 0) await pause(page, 180_000, 360_000)
    }
  }

  setStatus('ok', { sent, skipped, remaining: valid.length - sent })
}

async function readProfile(page) {
  const handle = String(profileHandle || '').replace(/^@/, '').trim()
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) halt('error', `Invalid handle: ${handle}`, 1)
  setStatus('profiling', { username: handle })
  await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await pause(page, 2400, 4600)
  await checkBlocked(page)
  const body = (await page.textContent('body').catch(() => '')) || ''
  if (/Sorry, this page isn't available|Page Not Found/i.test(body)) halt('not_found', `@${handle} was not found.`)
  if (!page.url().toLowerCase().includes(`/${handle.toLowerCase()}/`)) {
    halt('wrong_profile', `The page did not open @${handle}.`)
  }

  const data = await page.evaluate(() => {
    const header = document.querySelector('header') || document.body
    return {
      title: document.title,
      meta: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null,
      header: (header.innerText || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2500),
    }
  })

  const shot = path.join(PROFILES, `${handle}.png`)
  await page.screenshot({ path: shot }).catch(() => {})
  const output = {
    username: handle,
    url: `https://www.instagram.com/${handle}/`,
    ...data,
    screenshot: path.relative(ROOT, shot).replaceAll('\\', '/'),
    read_at: new Date().toISOString(),
  }
  const file = path.join(PROFILES, `${handle}.json`)
  saveJson(file, output)
  setStatus('ok', { username: handle, file: path.relative(ROOT, file).replaceAll('\\', '/') })
}

let context
let page
try {
  if (mode === 'send' && !forceHours && !withinHours(new Date(), HOUR_START, HOUR_END)) {
    halt('outside_hours', `Sending is allowed only between ${HOUR_START}:00 and ${HOUR_END}:00.`, 3)
  }
  if (mode === 'send' && sentToday() >= DAILY_SEND_LIMIT) {
    halt('daily_cap', `The daily limit of ${DAILY_SEND_LIMIT} replies is already reached.`, 3)
  }
  const replies = mode === 'send' ? loadReplies() : null

  context = await launch()
  process.on('SIGINT', async () => {
    setStatus('stopped', { message: 'Stopped by signal' })
    await context?.close().catch(() => {})
    process.exit(0)
  })
  page = context.pages()[0] || (await context.newPage())
  setStatus('opening', { message: 'Chrome opened' })
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await pause(page, 1800, 3400)
  await dismissCookies(page)
  await assertAccount(page, context)

  if (mode === 'scan') await scan(page)
  else if (mode === 'profile') await readProfile(page)
  else await send(page, replies)
} catch (error) {
  if (error instanceof Halt) {
    setStatus(error.stateName, { message: error.message })
    console.error(error.message)
    process.exitCode = error.code
  } else if (/has been closed|Target closed|Browser has been closed/i.test(error.message)) {
    setStatus('closed', { message: 'Chrome window was closed before the run finished' })
  } else {
    await page?.screenshot({ path: path.join(RUNTIME, 'error.png') }).catch(() => {})
    setStatus('error', { message: error.message })
    console.error(error.message)
    process.exitCode = 2
  }
} finally {
  await context?.close().catch(() => {})
}
