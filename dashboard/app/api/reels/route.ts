import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { emptyDb, normalizeDb, type ReelsDb } from '@/lib/reels'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DB_PATH = path.join(process.cwd(), '..', 'data', 'main-database', 'reels_database.json')

async function read() {
  try {
    return normalizeDb(JSON.parse(await readFile(DB_PATH, 'utf8')))
  } catch {
    return emptyDb()
  }
}

export async function GET() {
  return NextResponse.json(await read())
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ReelsDb | null
  if (!body || typeof body !== 'object' || typeof body.accounts !== 'object' || body.accounts == null) {
    return NextResponse.json({ error: 'ساختار دیتابیس معتبر نیست.' }, { status: 400 })
  }
  const db = normalizeDb(body)
  await mkdir(path.dirname(DB_PATH), { recursive: true })
  const tmp = `${DB_PATH}.tmp`
  await writeFile(tmp, JSON.stringify(db, null, 2), 'utf8')
  await rename(tmp, DB_PATH)
  return NextResponse.json({ ok: true, active_account: db.active_account, accounts: Object.keys(db.accounts) })
}
