import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLANS = path.join(process.cwd(), '..', 'data', 'content-hunt', 'plans')

interface Slot {
  rank?: number
  window?: string
  start?: string
  archetype?: string
  tier?: number
  activity?: number
  activity_share?: number
  shortcode?: string
  score?: number
  theme?: string
  theme_fit?: number
  caption?: string
  content?: string
  source_url?: string
  reasons?: string[]
}

interface Plan {
  date?: string
  timezone?: string
  capacity?: number
  generated_at?: string
  activity_fetched_at?: string | null
  slots?: Slot[]
  unscheduled?: { shortcode?: string; score?: number; reason?: string }[]
}

const tehranToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date())

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? tehranToday()
  const count = Math.min(Math.max(Number(url.searchParams.get('days') ?? 7), 1), 14)

  const plans = new Map<string, Plan>()
  try {
    for (const name of await readdir(PLANS)) {
      if (!name.endsWith('.json')) continue
      try {
        const plan = JSON.parse(await readFile(path.join(PLANS, name), 'utf8')) as Plan
        plans.set(name.replace(/\.json$/, ''), plan)
      } catch {
        // a half-written plan should not break the week
      }
    }
  } catch {
    // no plans folder yet
  }

  const days = Array.from({ length: count }, (_, index) => {
    const date = addDays(from, index)
    const plan = plans.get(date) ?? null
    return {
      date,
      plan: plan
        ? {
            capacity: plan.capacity ?? plan.slots?.length ?? 0,
            generated_at: plan.generated_at ?? null,
            activity_fetched_at: plan.activity_fetched_at ?? null,
            slots: plan.slots ?? [],
            unscheduled: plan.unscheduled ?? [],
          }
        : null,
    }
  })

  return NextResponse.json({
    from,
    today: tehranToday(),
    days,
    planFiles: [...plans.keys()].sort(),
  })
}
