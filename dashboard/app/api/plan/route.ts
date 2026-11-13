import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOT = path.join(process.cwd(), '..', 'data', 'content-hunt', 'plans')
const DATE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('date')
  const entries = await readdir(ROOT).catch(() => [])
  const dates = entries
    .map((name) => name.replace(/\.json$/, ''))
    .filter((name) => DATE.test(name))
    .sort()
    .reverse()

  const date = requested && DATE.test(requested) ? requested : dates[0]
  if (!date) {
    return NextResponse.json({ date: null, dates: [], slots: [], unscheduled: [] })
  }

  try {
    const raw = (await readFile(path.join(ROOT, `${date}.json`), 'utf8')).replace(/^\uFEFF/, '')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return NextResponse.json({ date, dates, ...parsed })
  } catch {
    return NextResponse.json({ date, dates, slots: [], unscheduled: [] })
  }
}
