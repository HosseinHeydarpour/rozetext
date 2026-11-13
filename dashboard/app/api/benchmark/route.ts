import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DB_PATH = path.join(process.cwd(), '..', 'data', 'benchmark-accounts', 'benchmark_accounts.json')

interface RawAccount {
  handle: string
  name_fa?: string
  cluster?: string
  followers?: string
  top_views_recorded?: string
  avg_views?: string
  matching_archetypes?: string[]
  content_style?: string
  profile_url?: string
  status?: string
  verified?: boolean
  verified_at?: string
  posts?: number
  following?: number
  followers_count?: number
  avatar_base64?: string
  avatar_mime?: string
  private?: boolean
}

export interface BenchmarkAccount {
  handle: string
  name: string
  cluster: string
  followersLabel: string
  followers: number | null
  posts: number | null
  following: number | null
  avgViews: string
  topViews: string
  archetypes: string[]
  style: string
  url: string
  verified: boolean
  verifiedAt: string | null
  avatar: string | null
}

export async function GET() {
  try {
    const raw = JSON.parse(await readFile(DB_PATH, 'utf8')) as { meta?: Record<string, unknown>; accounts?: RawAccount[] }
    const accounts: BenchmarkAccount[] = (raw.accounts ?? []).map((account) => ({
      handle: account.handle,
      name: account.name_fa?.trim() || account.handle.replace(/^@/, ''),
      cluster: account.cluster ?? '',
      followersLabel: account.followers ?? '',
      followers: account.followers_count ?? null,
      posts: account.posts ?? null,
      following: account.following ?? null,
      avgViews: account.avg_views ?? '',
      topViews: account.top_views_recorded ?? '',
      archetypes: account.matching_archetypes ?? [],
      style: account.content_style ?? '',
      url: account.profile_url ?? `https://www.instagram.com/${account.handle.replace(/^@/, '')}/`,
      verified: Boolean(account.verified),
      verifiedAt: account.verified_at ?? null,
      avatar: account.avatar_base64 ? `data:${account.avatar_mime ?? 'image/jpeg'};base64,${account.avatar_base64}` : null,
    }))
    const clusters = [...new Set(accounts.map((account) => account.cluster).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fa'))
    return NextResponse.json({ meta: raw.meta ?? {}, clusters, accounts })
  } catch {
    return NextResponse.json({ meta: {}, clusters: [], accounts: [] }, { status: 200 })
  }
}
