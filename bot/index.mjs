import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { serve, tunnel } from './miniapp.mjs'
import { LABELS, SKILLS } from './skills.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
try {
  process.loadEnvFile(path.join(ROOT, '.env'))
} catch {}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim()
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN نیست. در .env اضافه‌اش کن.')
  process.exit(1)
}

const API = `https://api.telegram.org/bot${TOKEN}`
const OWNER = process.env.TELEGRAM_ALLOWED_CHAT_ID?.trim() ?? ''
const MODEL = process.env.OPENCODE_MODEL?.trim() || 'opencode-go/deepseek-v4.1-flash'
const TIMEOUT = 15 * 60 * 1000

let session = process.env.OPENCODE_SESSION?.trim() || 'ses_telegram'
let title = sessionTitle()

function sessionTitle() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `Telegram ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function findCli() {
  if (process.env.OPENCODE_CLI) return process.env.OPENCODE_CLI
  const base = path.join(process.env.APPDATA ?? '', 'ai.opencode.desktop', 'cli')
  try {
    // shortcut: version dirs sorted as strings, switch to semver compare when versions reach 2.10
    for (const dir of fs.readdirSync(base).sort().reverse()) {
      const exe = path.join(base, dir, 'opencode-cli.exe')
      if (fs.existsSync(exe)) return exe
    }
  } catch {}
  return 'opencode'
}

const CLI = findCli()

function skillNames(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

const present = new Set(skillNames(path.join(ROOT, '.opencode', 'skills')))
const available = SKILLS.filter((skill) => present.has(skill.name))

const INTRO = 'یک اسکیل انتخاب کن، بعد پیامت را بفرست.\nفقط اسکیل‌های rozetext در دسترس‌اند؛ اگر اسکیل نمی‌خواهی، همین‌طوری بنویس.'

function menu() {
  const rows = []
  for (let i = 0; i < available.length; i += 2) {
    rows.push(available.slice(i, i + 2).map((skill) => ({ text: skill.label, callback_data: `sk:${skill.name}` })))
  }
  rows.push([{ text: '🆕 سشن تازه', callback_data: 'new' }])
  return { inline_keyboard: rows }
}

async function tg(method, payload) {
  const response = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(method === 'getUpdates' ? 60000 : 20000),
  })
  const data = await response.json()
  if (!data.ok) throw new Error(`${method}: ${data.description}`)
  return data.result
}

function split(text, size = 4000) {
  const parts = []
  let rest = text.trim()
  while (rest.length > size) {
    const cut = rest.lastIndexOf('\n', size)
    const at = cut > 0 ? cut : size
    parts.push(rest.slice(0, at))
    rest = rest.slice(at).trimStart()
  }
  if (rest) parts.push(rest)
  return parts
}

async function say(chat, text) {
  const parts = split(text)
  for (const part of parts.slice(0, 5)) await tg('sendMessage', { chat_id: chat, text: part })
  if (parts.length > 5) await tg('sendMessage', { chat_id: chat, text: 'جواب بلندتر بود؛ ادامه‌اش را در اپ ببین.' })
}

function runOpencode(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      CLI,
      ['run', '--session', session, '--auto', '--model', MODEL, '--format', 'json', '--title', title, prompt],
      { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill(), TIMEOUT)
    timer.unref()

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      clearTimeout(timer)
      const texts = []
      for (const line of stdout.split('\n')) {
        if (!line.startsWith('{')) continue
        try {
          const event = JSON.parse(line)
          if (event.type === 'text' && event.part?.text) texts.push(event.part.text)
        } catch {}
      }
      if (code === 0) return resolve(texts.join('\n\n') || 'پاسخی برنگشت.')
      const clean = stderr.replace(/\u001b\[[0-9;]*m/g, '').trim()
      reject(new Error(clean || `opencode با کد ${code} بست.`))
    })
  })
}

const pending = new Map()
const queue = []
let busy = false

function pump() {
  if (busy) return
  busy = true
  ;(async () => {
    while (queue.length) {
      try {
        await queue.shift()()
      } catch (error) {
        console.error(error)
      }
    }
    busy = false
  })()
}

async function work(chat, prompt) {
  const note = await tg('sendMessage', { chat_id: chat, text: 'در حال اجرا' })
  const started = Date.now()
  const beat = setInterval(() => {
    const minutes = Math.round((Date.now() - started) / 60000)
    tg('editMessageText', {
      chat_id: chat,
      message_id: note.message_id,
      text: `در حال اجرا، ${minutes} دقیقه`,
    }).catch(() => {})
  }, 120000)
  beat.unref()

  try {
    await say(chat, await runOpencode(prompt))
    await tg('deleteMessage', { chat_id: chat, message_id: note.message_id }).catch(() => {})
  } catch (error) {
    await tg('editMessageText', {
      chat_id: chat,
      message_id: note.message_id,
      text: `اجرا نشد: ${error.message}`.slice(0, 4000),
    }).catch(() => {})
  } finally {
    clearInterval(beat)
  }
}

async function handle(update) {
  const callback = update.callback_query
  const message = update.message
  const chat = String(callback?.message?.chat?.id ?? message?.chat?.id ?? '')
  if (!chat) return

  const answer = (text) =>
    tg('answerCallbackQuery', { callback_query_id: callback.id, text }).catch(() => {})

  if (!OWNER || chat !== OWNER) {
    if (callback) return answer('دسترسی نداری')
    return say(chat, `این ربات فقط برای صاحبش کار می‌کند.\nchat id این چت: ${chat}`)
  }

  if (callback) {
    const data = callback.data ?? ''
    if (data === 'new') {
      session = `ses_telegram_${Date.now().toString(36)}`
      title = sessionTitle()
      pending.delete(chat)
      return answer('سشن تازه ساخته شد.')
    }
    const skill = data.slice(3)
    const label = LABELS.get(skill)
    if (!label) {
      pending.delete(chat)
      return answer('این اسکیل در دسترس نیست.')
    }
    pending.set(chat, skill)
    return answer(`اسکیل ${label} فعال شد. پیامت را بفرست.`)
  }

  const text = message.text?.trim()
  if (!text) return

  if (text.startsWith('/start') || text.startsWith('/menu')) {
    const payload = text.split(/\s+/)[1] ?? ''
    const skill = payload.startsWith('sk_') ? payload.slice(3) : ''
    if (!skill) return tg('sendMessage', { chat_id: chat, text: INTRO, reply_markup: menu() })
    const label = LABELS.get(skill)
    if (!label) return say(chat, 'این اسکیل در دسترس نیست.')
    pending.set(chat, skill)
    return say(chat, `اسکیل ${label} فعال شد. پیامت را بفرست.`)
  }
  if (text.startsWith('/new')) {
    session = `ses_telegram_${Date.now().toString(36)}`
    title = sessionTitle()
    return say(chat, 'سشن تازه ساخته شد.')
  }
  if (text.startsWith('/id')) return say(chat, chat)

  if (busy || queue.length) return say(chat, 'در حال اجرای درخواست قبلی‌ام. یکی‌یکی بفرست.')

  const skill = pending.get(chat)
  pending.delete(chat)
  const limit = 'Only use skills whose name starts with "rozetext".'
  const prompt = skill ? `${limit} Follow the "${skill}" skill for this request:\n\n${text}` : `${limit}\n\n${text}`

  queue.push(() => work(chat, prompt))
  pump()
}

async function poll() {
  let offset = 0
  try {
    // keep the newest pending update so a command sent during a restart is not lost
    const seed = await tg('getUpdates', { offset: -1 })
    if (seed.length) offset = seed.at(-1).update_id
  } catch {}

  for (;;) {
    try {
      const updates = await tg('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] })
      for (const update of updates) {
        offset = update.update_id + 1
        handle(update).catch((error) => console.error(error))
      }
    } catch (error) {
      console.error(error.message)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

const me = await tg('getMe')
console.log(`@${me.username} up, ${available.length} skills, session ${session}`)

if (!OWNER) {
  console.log('TELEGRAM_ALLOWED_CHAT_ID خالی است. /start بفرست تا chat id را ببینی.')
} else {
  const port = Number(process.env.MINIAPP_PORT || 8787)
  try {
    await serve(me.username, port)
    const url = await tunnel(port)
    if (url) {
      await tg('setChatMenuButton', {
        chat_id: OWNER,
        menu_button: { type: 'web_app', text: 'اسکیل‌ها', web_app: { url } },
      })
      console.log(`mini app: ${url}`)
    } else {
      console.log('تونل بالا نیامد. مینی‌اپ خاموش است.')
    }
  } catch (error) {
    console.log(`mini app off: ${error.message}`)
  }
}

poll()
