import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { readGroups } from './groups'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOT = path.join(process.cwd(), '..')

interface SkillEntry {
  name: string
  label: string
  summary: string
  when: string
  steps: string[]
}

async function readEnv() {
  const env: Record<string, string> = {}
  let error: string | null = null
  try {
    const text = await readFile(path.join(ROOT, '.env'), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (match) env[match[1]] = match[2].trim()
    }
  } catch (cause) {
    error = String((cause as Error).message ?? cause)
  }
  return { env, error }
}

async function telegramMe(token: string) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: controller.signal })
    clearTimeout(timer)
    const body = (await response.json()) as { ok: boolean; result?: { username?: string; first_name?: string }; description?: string }
    if (!body.ok) return { ok: false, error: body.description ?? 'getMe failed' }
    return { ok: true, username: body.result?.username ?? '', name: body.result?.first_name ?? '' }
  } catch (error) {
    return { ok: false, error: String((error as Error).message ?? error) }
  }
}

export async function GET() {
  const { env, error: envError } = await readEnv()
  const token = env.TELEGRAM_BOT_TOKEN ?? ''
  const owner = env.TELEGRAM_ALLOWED_CHAT_ID ?? ''

  const skills = await readSkills()
  const groups = await readGroups()

  const health = token ? await telegramMe(token) : { ok: false, error: 'TELEGRAM_BOT_TOKEN تنظیم نشده است.' }

  return NextResponse.json({
    tokenSet: Boolean(token),
    ownerSet: Boolean(owner),
    ownerMasked: owner ? `${owner.slice(0, 3)}…${owner.slice(-2)}` : null,
    webappUrl: env.TELEGRAM_WEBAPP_URL ? env.TELEGRAM_WEBAPP_URL.replace(/(bot[^/]+)/, 'bot***') : null,
    model: env.OPENCODE_MODEL ?? null,
    health,
    skills,
    groups,
    envError,
    command: 'npm run bot',
  })
}

/**
 * Turbopack refuses a dynamic import with a computed path, so the bot catalog is read
 * from its source and the literal fields are picked out. It never evaluates the file.
 */
async function readSkills(): Promise<SkillEntry[]> {
  try {
    const source = await readFile(path.join(ROOT, 'bot', 'skills.mjs'), 'utf8')
    const block = source.slice(source.indexOf('export const SKILLS = ['))
    const objects = block.split(/\n  \{\n/).slice(1)
    const pick = (text: string, key: string) => text.match(new RegExp(`${key}: '([^']*)'`))?.[1] ?? ''
    const steps = (text: string) => {
      const inner = text.match(/steps: \[([\s\S]*?)\n    \],/)?.[1] ?? ''
      return [...inner.matchAll(/'([^']*)'/g)].map((match) => match[1])
    }
    return objects.map((text) => ({
      name: pick(text, 'name'),
      label: pick(text, 'label'),
      summary: pick(text, 'summary'),
      when: pick(text, 'when'),
      steps: steps(text),
    })).filter((skill) => skill.name)
  } catch {
    return []
  }
}
