import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SNAPSHOT_PATH = path.join(process.cwd(), 'src', 'data', 'snapshot.json')

export async function GET() {
  try {
    return NextResponse.json(JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8')))
  } catch {
    return NextResponse.json({ error: 'snapshot.json خوانده نشد.' }, { status: 500 })
  }
}
