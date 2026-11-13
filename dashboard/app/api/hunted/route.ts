import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOT = path.join(process.cwd(), '..', 'data', 'hunted-candidates')
const DATE = /^\d{4}-\d{2}-\d{2}$/

async function availableDates() {
  const entries = await readdir(ROOT, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((entry) => entry.isDirectory() && DATE.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse()
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
    return NextResponse.json({ date, dates, ...parsed })
  } catch {
    return NextResponse.json({ date, dates, count: 0, candidates: [] })
  }
}
