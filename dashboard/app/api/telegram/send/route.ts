import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { readGroups } from '../groups'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOT = path.join(process.cwd(), '..')

async function readToken() {
  try {
    const text = await readFile(path.join(ROOT, '.env'), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^TELEGRAM_BOT_TOKEN=(.*)$/)
      if (match) return match[1].trim()
    }
  } catch {
    // no env file
  }
  return ''
}

interface SendBody {
  chatId?: string
  caption?: string
  image?: string
  video?: string
}

const decode = (value: string) => {
  const comma = value.indexOf(',')
  const meta = comma >= 0 ? value.slice(0, comma) : ''
  const base64 = comma >= 0 ? value.slice(comma + 1) : value
  return { mime: meta.match(/^data:([^;]+)/)?.[1] ?? '', buffer: Buffer.from(base64, 'base64') }
}

/**
 * Posts a ready item into a Telegram group the bot was added to.
 * The bot itself only listens; publishing from the dashboard goes through here.
 */
export async function POST(request: Request) {
  const token = await readToken()
  if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN تنظیم نشده است.' }, { status: 400 })

  const body = (await request.json().catch(() => ({}))) as SendBody
  const chatId = body.chatId?.trim() ?? ''
  const groups = await readGroups()
  if (!chatId.startsWith('-') || !groups.some((group) => String(group.id) === chatId)) {
    return NextResponse.json({ error: 'این گروه ثبت نشده؛ ربات را به گروه اضافه کن یا در گروه پیامی بفرست.' }, { status: 400 })
  }

  const caption = (body.caption ?? '').slice(0, 1000)
  const form = new FormData()
  form.set('chat_id', chatId)
  if (caption) form.set('caption', caption)

  let method = 'sendMessage'
  if (body.image) {
    const { mime, buffer } = decode(body.image)
    if (buffer.length > 9 * 1024 * 1024) return NextResponse.json({ error: 'تصویر بزرگ‌تر از ۹ مگابایت است.' }, { status: 400 })
    const type = mime.startsWith('image/') ? mime : 'image/png'
    form.set('photo', new Blob([buffer], { type }), `cover.${type.split('/')[1] ?? 'png'}`)
    method = 'sendPhoto'
  } else if (body.video) {
    const { mime, buffer } = decode(body.video)
    if (buffer.length > 45 * 1024 * 1024) return NextResponse.json({ error: 'ویدیو بزرگ‌تر از ۴۵ مگابایت است.' }, { status: 400 })
    const type = mime.startsWith('video/') ? mime : 'video/mp4'
    form.set('video', new Blob([buffer], { type }), `clip.${type.split('/')[1] ?? 'mp4'}`)
    method = 'sendVideo'
  } else {
    if (!caption) return NextResponse.json({ error: 'متن یا فایل برای ارسال لازم است.' }, { status: 400 })
    form.set('text', caption)
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', body: form })
    const result = (await response.json()) as { ok: boolean; description?: string; result?: { message_id?: number } }
    if (!result.ok) return NextResponse.json({ error: result.description ?? 'تلگرام درخواست را رد کرد.' }, { status: 400 })
    return NextResponse.json({ ok: true, messageId: result.result?.message_id ?? null })
  } catch (error) {
    return NextResponse.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  }
}
