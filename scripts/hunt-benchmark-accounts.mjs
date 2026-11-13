import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const DATA = path.join(ROOT, 'data', 'benchmark-accounts', 'benchmark_accounts.json')
const STATUS = path.join(RUNTIME, 'benchmark-hunt.json')
const ERROR_SHOT = path.join(RUNTIME, 'benchmark-hunt-error.png')
const COLLECTOR = 'hosseinheydarpour'
const PAGE_ACCOUNT = 'rozetext.ir'
const SYSTEM_PATHS = new Set([
  'explore', 'reels', 'direct', 'stories', 'accounts', 'legal', 'popular', 'about',
  'privacy', 'terms', 'language', 'help', 'press', 'api', 'jobs', 'locations',
  'meta_verified', 'emails', 'session', 'challenge', 'checkpoint',
])

try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

const argValue = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const dataPath = path.resolve(argValue('data') || DATA)
const limit = Math.min(25, Math.max(1, Number(argValue('limit')) || 10))
const huntCount = Math.max(0, Number(argValue('hunt')) || 0)
const seedArg = argValue('seed')
const dryRun = process.argv.includes('--dry-run')

const setStatus = (state, message, extra = {}) => {
  fs.mkdirSync(RUNTIME, { recursive: true })
  fs.writeFileSync(
    STATUS,
    JSON.stringify({ state, message, ...extra, pid: process.pid, updated_at: new Date().toISOString() }, null, 2),
  )
}

let data
try {
  data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
} catch (error) {
  console.error(`Could not read ${path.relative(ROOT, dataPath)}: ${error.message}`)
  process.exit(1)
}
if (!Array.isArray(data.accounts)) {
  console.error('The benchmark file has no accounts array.')
  process.exit(1)
}

const normalize = (handle) => String(handle || '').replace(/^@/, '').trim().toLowerCase()
const blacklist = new Set((data.meta?.blacklist_enforced || []).map(normalize))
const seen = new Set()
const duplicates = []
for (const account of data.accounts) {
  const key = normalize(account.handle)
  if (!key) continue
  if (seen.has(key)) duplicates.push(account.handle)
  seen.add(key)
}
if (duplicates.length) {
  console.error(`Duplicate handles in the registry: ${duplicates.join(', ')}. Fix them before running.`)
  process.exit(1)
}
if (seen.has(PAGE_ACCOUNT) || seen.has(COLLECTOR)) {
  console.error(`The registry contains a system account (@${PAGE_ACCOUNT} or @${COLLECTOR}). Remove it before running.`)
  process.exit(1)
}

const pending = data.accounts.filter(
  (account) => !account.verified && !account.verify_error && !blacklist.has(normalize(account.handle)),
)
const notFound = data.accounts.filter((account) => account.verify_error === 'not_found').length
const styleReviewPending = data.accounts.filter((account) => account.needs_style_review).length

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        file: path.relative(ROOT, dataPath),
        total: data.accounts.length,
        verified: data.accounts.filter((account) => account.verified).length,
        pending: pending.length,
        not_found: notFound,
        style_review_pending: styleReviewPending,
        hunt: huntCount,
        preview: pending.slice(0, limit).map((account) => account.handle),
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (huntCount > 0 && pending.length > 0) {
  console.error('There are still unverified accounts. Verify them before hunting new ones.')
  process.exit(1)
}
if (!huntCount && !pending.length) {
  setStatus('no_work', 'No unverified accounts left.', { remaining: 0, not_found: notFound })
  console.error('No unverified accounts left.')
  process.exit(3)
}
if ((process.env.IG_COLLECT_USERNAME || '').trim() !== COLLECTOR) {
  console.error(`IG_COLLECT_USERNAME must be ${COLLECTOR}; refusing to run.`)
  process.exit(1)
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
  console.error('Refusing to run: this profile belongs to the main account.')
  process.exit(1)
}

function save() {
  data.meta = { ...data.meta, last_run_at: new Date().toISOString() }
  const tmp = `${dataPath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, dataPath)
}

const pause = (page, min = 2000, max = 4000) =>
  page.waitForTimeout(min + Math.floor(Math.random() * Math.max(1, max - min)))

function parseCount(text) {
  if (!text) return null
  const normalized = String(text)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/,/g, '')
    .replace(/[\u00a0\u202f]/g, ' ')
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([KMB])?/i)
  if (!match) return null
  const value = Number(match[1])
  const unit = (match[2] || '').toUpperCase()
  const multiplier = unit === 'B' ? 1e9 : unit === 'M' ? 1e6 : unit === 'K' ? 1e3 : 1
  return Math.round(value * multiplier)
}

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

async function dismissCookies(page) {
  for (const text of ['Allow all cookies', 'Allow essential cookies', 'Decline optional cookies']) {
    const button = page.getByRole('button', { name: text }).first()
    if ((await button.count()) && (await button.isVisible().catch(() => false))) {
      await button.click().catch(() => {})
      await pause(page, 500, 1200)
      return
    }
  }
}

async function readProfile(page, handle, options = {}) {
  const { review = false } = options
  const response = await page.goto(`https://www.instagram.com/${handle}/`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await pause(page, 2400, 4800)
  await page.mouse.move(250 + Math.floor(Math.random() * 700), 220 + Math.floor(Math.random() * 450)).catch(() => {})
  await page.mouse.wheel(0, 180 + Math.floor(Math.random() * 520)).catch(() => {})
  await pause(page, 900, 1900)

  const url = page.url()
  const body = (await page.textContent('body').catch(() => '')) || ''
  if (/\/challenge|\/checkpoint/i.test(url) || /Please wait a few minutes|We restrict certain activity|Confirm it.s you|Help us confirm|suspended/i.test(body)) {
    return { challenge: true }
  }
  if (await page.locator('input[name="username"]').first().isVisible().catch(() => false)) {
    return { loggedOut: true }
  }
  if (response?.status() === 404 || /Sorry, this page isn't available|Page Not Found|صفحه.*در دسترس نیست/i.test(body)) {
    return { notFound: true }
  }

  const readHeader = () =>
    page.evaluate(() => {
      const header = document.querySelector('header') || document.body
      const lines = (header.innerText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      const hasNumber = (line) => /[\d۰-۹٠-٩]/.test(line)
      const stat = (pattern) => lines.find((line) => pattern.test(line) && hasNumber(line)) || ''
      const avatar =
        header.querySelector('img[alt*="profile picture"], img[alt*="profile photo"], img[alt*="عکس پروفایل"]') ||
        header.querySelector('img')
      return {
        postsText: stat(/posts?|پست/i),
        followersText: stat(/followers?|دنبال.?کننده/i),
        followingText: stat(/following|دنبال.?شده/i),
        avatarUrl: avatar?.src || null,
        name: (header.querySelector('h1, h2')?.innerText || '').trim(),
        privatePage: /This account is private|این حساب خصوصی است/i.test(document.body.innerText),
      }
    })

  const toResult = (info) => ({
    posts: parseCount(info.postsText),
    followers: parseCount(info.followersText),
    following: parseCount(info.followingText),
    name: info.name,
    private: info.privatePage,
    avatarUrl: info.avatarUrl,
  })

  let result = toResult(await readHeader())
  if (!result.private && result.posts === null && result.followers === null) {
    // A slow profile can render after the first pass; retry once before calling it incomplete.
    await pause(page, 2500, 4000)
    await page.mouse.wheel(0, 260 + Math.floor(Math.random() * 320)).catch(() => {})
    await pause(page, 900, 1800)
    result = toResult(await readHeader())
  }
  if (!result.private && result.posts === null && result.followers === null) return { incomplete: true }

  if (review) {
    const image = path.join(RUNTIME, `benchmark-review-${handle}.png`)
    await page.screenshot({ path: image }).catch(() => {})
    result.style_review_image = path.relative(ROOT, image)
    result.profile_text = await page.evaluate(() => (document.querySelector('header')?.innerText || '').slice(0, 800))
    result.needs_style_review = true
  }
  return result
}

async function fetchAvatar(context, url) {
  if (!url) return null
  if (url.startsWith('data:')) {
    const [meta, base64] = url.split(',')
    return { base64, mime: meta.slice(5).split(';')[0] || 'image/jpeg' }
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await context.request.get(url, { timeout: 30_000 })
      if (!response.ok()) throw new Error(`avatar ${response.status()}`)
      return {
        base64: (await response.body()).toString('base64'),
        mime: (response.headers()['content-type'] || 'image/jpeg').split(';')[0],
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    }
  }
  return null
}

function markVerified(account, result, avatar) {
  const isNew = !account.verified
  Object.assign(account, {
    verified: true,
    verified_at: new Date().toISOString(),
    posts: result.posts,
    following: result.following,
    followers_count: result.followers,
    avatar_base64: avatar?.base64 || null,
    avatar_mime: avatar?.mime || null,
    private: result.private,
  })
  if (isNew) {
    account.status = 'candidate'
    if (account.style_match === undefined) account.style_match = null
    account.needs_style_review = account.style_match === null
    account.style_review_image = result.style_review_image || account.style_review_image || null
    account.profile_text = result.profile_text || account.profile_text || null
  }
  delete account.verify_error
}

const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
})

let page
try {
  page = context.pages()[0] || (await context.newPage())
  setStatus('checking_session', 'Checking the collector session')
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await pause(page, 2000, 4000)
  await dismissCookies(page)

  const loggedInAs = await currentUsername(page)
  if (loggedInAs !== COLLECTOR) {
    await page.screenshot({ path: ERROR_SHOT }).catch(() => {})
    setStatus('error', `Session is ${loggedInAs || 'logged out'}, expected ${COLLECTOR}. Run rozetext-data-collect-account-login.`)
    console.error(`Session is ${loggedInAs || 'logged out'}, expected ${COLLECTOR}.`)
    await context.close()
    process.exit(2)
  }

  if (huntCount > 0) {
    const requestedSeeds = (seedArg || '').split(',').map(normalize).filter(Boolean)
    const peerSeeds = data.accounts
      .filter((account) => account.verified && account.style_match !== false && account.status !== 'candidate')
      .map((account) => normalize(account.handle))
    const availableSeeds = new Set(peerSeeds)
    const chosenSeeds = requestedSeeds.length
      ? requestedSeeds.filter((handle) => availableSeeds.has(handle))
      : peerSeeds
    if (!chosenSeeds.length) {
      setStatus('error', 'No verified peer seeds available for hunting.')
      console.error('No verified peer seeds available for hunting.')
      await context.close()
      process.exit(1)
    }
    const orderedSeeds = requestedSeeds.length
      ? chosenSeeds
      : chosenSeeds
          .map((value) => [Math.random(), value])
          .sort((a, b) => a[0] - b[0])
          .map(([, value]) => value)
    const pool = orderedSeeds.slice(0, 6)

    let added = 0
    for (const seed of pool) {
      if (added >= huntCount) break
      setStatus('hunting', `Looking for accounts similar to @${seed}`, { added, target: huntCount })
      await page.goto(`https://www.instagram.com/${seed}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await pause(page, 2600, 5200)
      const clicked = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button, div[role="button"]')]
        const button = buttons.find((candidate) => {
          const label = candidate.getAttribute('aria-label') || ''
          return (
            /similar|suggested|مشابه|پیشنهاد/i.test(label) ||
            Boolean(candidate.querySelector('svg[aria-label*="Similar"], svg[aria-label*="مشابه"], svg[aria-label*="پیشنهاد"]'))
          )
        })
        if (!button) return false
        button.click()
        return true
      })
      if (!clicked) continue
      await pause(page, 2600, 4600)

      const candidates = await page.evaluate(() =>
        [...document.querySelectorAll('a[href]')]
          .map((a) => a.getAttribute('href'))
          .filter((href) => /^\/[A-Za-z0-9._]+\/$/.test(href))
          .map((href) => href.replaceAll('/', '').toLowerCase()),
      )

      for (const handle of candidates) {
        if (added >= huntCount) break
        if (
          seen.has(handle) ||
          blacklist.has(handle) ||
          SYSTEM_PATHS.has(handle) ||
          handle === COLLECTOR ||
          handle === PAGE_ACCOUNT ||
          handle.length < 3
        ) {
          continue
        }

        setStatus('hunting', `Checking @${handle}`, { added, target: huntCount, current: `@${handle}` })
        const result = await readProfile(page, handle, { review: true })
        if (result.challenge || result.loggedOut) {
          await page.screenshot({ path: ERROR_SHOT }).catch(() => {})
          setStatus('needs_human', 'Instagram asked for a challenge or the session dropped. Stop here.', {
            added,
            target: huntCount,
            current: `@${handle}`,
          })
          await context.close()
          process.exit(2)
        }
        if (result.notFound || result.incomplete || result.private) continue

        const avatar = await fetchAvatar(context, result.avatarUrl)
        const account = {
          handle: `@${handle}`,
          name_fa: result.name || `@${handle}`,
          cluster: '',
          followers: null,
          top_views_recorded: null,
          avg_views: null,
          matching_archetypes: [],
          content_style: '',
          profile_url: `https://www.instagram.com/${handle}/`,
          status: 'candidate',
          verified: true,
          verified_at: new Date().toISOString(),
          posts: result.posts,
          following: result.following,
          followers_count: result.followers,
          avatar_base64: avatar?.base64 || null,
          avatar_mime: avatar?.mime || null,
          private: false,
          style_match: null,
          needs_style_review: true,
          style_review_image: result.style_review_image || null,
          profile_text: result.profile_text || null,
          source: `suggested:@${seed}`,
          discovered_at: new Date().toISOString(),
        }
        data.accounts.push(account)
        seen.add(handle)
        added += 1
        save()
        setStatus('hunting', `Added candidate @${handle}`, { added, target: huntCount, current: `@${handle}` })
        await pause(page, 6000, 13000)
      }

      if (added < huntCount) await pause(page, 8000, 16000)
    }

    setStatus('ok', `Hunted ${added} candidate(s) of ${huntCount}. Review their style before counting them.`, {
      hunted: added,
      target: huntCount,
      style_review_pending: data.accounts.filter((account) => account.needs_style_review).length,
      total: data.accounts.length,
    })
    console.log(`Hunted ${added} candidate(s) of ${huntCount}. Review their style before counting them.`)
    await context.close()
    process.exit(0)
  }

  let done = 0
  let failed = 0
  let consecutiveFailures = 0
  for (const account of pending.slice(0, limit)) {
    const handle = normalize(account.handle)
    setStatus('verifying', `Checking @${handle}`, {
      current: `@${handle}`,
      done,
      failed,
      remaining: pending.length - done - failed,
    })

    let result
    try {
      result = await readProfile(page, handle, { review: true })
    } catch (error) {
      result = { incomplete: true, message: error.message }
    }

    if (result.challenge || result.loggedOut) {
      await page.screenshot({ path: ERROR_SHOT }).catch(() => {})
      setStatus('needs_human', 'Instagram asked for a challenge or the session dropped. Stop here.', {
        current: `@${handle}`,
        done,
        failed,
      })
      console.error('Instagram asked for a challenge or the session dropped. Stopped.')
      await context.close()
      process.exit(2)
    }

    if (result.notFound) {
      account.verified = false
      account.verified_at = new Date().toISOString()
      account.verify_error = 'not_found'
      failed += 1
      consecutiveFailures += 1
      save()
      setStatus('verifying', `@${handle} was not found`, {
        current: `@${handle}`,
        done,
        failed,
        remaining: pending.length - done - failed,
      })
    } else if (result.incomplete) {
      failed += 1
      consecutiveFailures += 1
      setStatus('verifying', `@${handle} did not load completely`, {
        current: `@${handle}`,
        done,
        failed,
        remaining: pending.length - done - failed,
      })
    } else {
      const avatar = await fetchAvatar(context, result.avatarUrl)
      markVerified(account, result, avatar)
      done += 1
      consecutiveFailures = 0
      save()
      setStatus('verifying', `Verified @${handle}`, {
        current: `@${handle}`,
        done,
        failed,
        remaining: pending.length - done - failed,
      })
    }

    if (consecutiveFailures >= 2) {
      setStatus('error', 'Two profiles failed in a row. Stopped to avoid hammering Instagram.', { done, failed })
      console.error('Two profiles failed in a row. Stopped.')
      await context.close()
      process.exit(2)
    }

    await pause(page, 6000, 13000)
    if ((done + failed) % 5 === 0) await pause(page, 20_000, 40_000)
  }

  setStatus('ok', `Verified ${done} account(s); ${failed} failed.`, {
    done,
    failed,
    remaining: pending.length - done - failed,
  })
  console.log(`Verified ${done} account(s); ${failed} failed.`)
  await context.close()
  process.exit(0)
} catch (error) {
  await page?.screenshot({ path: ERROR_SHOT }).catch(() => {})
  setStatus('error', error.message, { done: 0, failed: 0 })
  console.error(error.message)
  await context.close().catch(() => {})
  process.exit(2)
}
