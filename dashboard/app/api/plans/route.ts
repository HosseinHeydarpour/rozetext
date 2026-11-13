import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOT = path.join(process.cwd(), '..')
const SCRIPT = path.join(ROOT, 'scripts', 'plan-content.mjs')

/**
 * Runs the planner for one date: it reads the confirmed hunted texts and writes
 * data/content-hunt/plans/<date>.json. It never publishes anything.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { date?: string }
  const date = body.date
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: 'تاریخ نامعتبر است.' }, { status: 400 })
  }

  const run = () =>
    new Promise<string>((resolve, reject) => {
      execFile(process.execPath, [SCRIPT, `--date=${date}`], { cwd: ROOT, timeout: 120_000, windowsHide: true }, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr?.trim() || error.message))
        else resolve(stdout.trim())
      })
    })

  try {
    const output = await run()
    if (output.includes('no confirmed candidates')) {
      return NextResponse.json({
        ok: false,
        reason: 'no-candidates',
        output,
        error: 'هنوز متن تأییدشده‌ای وجود ندارد؛ اول اسکیل شکار محتوا باید اجرا شود.',
      })
    }
    const planPath = path.join(ROOT, 'data', 'content-hunt', 'plans', `${date}.json`)
    const plan = JSON.parse(await readFile(planPath, 'utf8'))
    return NextResponse.json({ ok: true, output, plan })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String((error as Error).message ?? error) }, { status: 500 })
  }
}
