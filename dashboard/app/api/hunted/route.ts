import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOT = path.join(process.cwd(), '..', 'data', 'hunted-candidates')
const PLANS = path.join(process.cwd(), '..', 'data', 'content-hunt', 'plans')
const DATE = /^\d{4}-\d{2}-\d{2}$/

async function availableDates() {
  const entries = await readdir(ROOT, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((entry) => entry.isDirectory() && DATE.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse()
}

async function planFor(date: string) {
  const files = await readdir(PLANS).catch(() => [])
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const plan = JSON.parse(await readFile(path.join(PLANS, file), 'utf8')) as { source_file?: string }
      const source = String(plan.source_file ?? '').replace(/\\/g, '/')
      if (source.endsWith(`hunted-candidates/${date}/candidates.json`)) return plan
    } catch {}
  }
  return null
}

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('date')
  const dates = await availableDates()
  const date = requested && DATE.test(requested) ? requested : dates[0]

  if (!date) {
    return NextResponse.json({ date: null, dates: [], count: 0, candidates: [] })
  }

  try {
    const raw = (await readFile(path.join(ROOT, date, 'candidates.json'), 'utf8')).replace(/^\uFEFF/, '')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return NextResponse.json({ date, dates, ...parsed, plan: await planFor(date) })
  } catch {
    return NextResponse.json({ date, dates, count: 0, candidates: [], plan: null })
  }
}
