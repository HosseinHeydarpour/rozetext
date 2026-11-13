import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOT = path.join(process.cwd(), '..')
const SCRIPT = path.join(ROOT, 'scripts', 'build-dashboard-data.mjs')
const SNAPSHOT_PATH = path.join(process.cwd(), 'src', 'data', 'snapshot.json')

/**
 * Rebuilds the dashboard snapshot from the newest files in data/exports.
 * It does not touch Instagram itself: the collector scripts own that, and scraping
 * takes minutes plus a logged-in browser session, which does not belong in a request.
 */
export async function POST() {
  const run = (file: string) =>
    new Promise<string>((resolve, reject) => {
      execFile(process.execPath, [file], { cwd: ROOT, timeout: 120_000, windowsHide: true }, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr?.trim() || error.message))
        else resolve(stdout)
      })
    })

  try {
    const output = await run(SCRIPT)
    const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'))
    return NextResponse.json({ ok: true, output: output.trim().split('\n').slice(-1)[0] ?? '', snapshot })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String((error as Error).message ?? error) }, { status: 500 })
  }
}
