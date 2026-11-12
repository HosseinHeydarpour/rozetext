export interface ReelStats {
  views: number
  followers: number
  share: number
  save: number
}

export interface ReelItem {
  url: string
  date: string
  caption: string
  content: string
  prediction: string
  is_flopped: boolean
  is_new: boolean
  is_updated: boolean
  last_stats: ReelStats
}

export interface Account {
  last_updated: string
  items: Record<string, ReelItem>
}

export interface ReelsDb {
  active_account: string
  accounts: Record<string, Account>
}

export interface ReelRow {
  id: string
  reelCode: string
  url: string
  date: string
  views: number
  followers: number
  share: number
  save: number
  tier: 'VIRAL' | 'MID' | 'FLOP'
  caption: string
  content: string
  prediction: string
  is_flopped: boolean
  is_new: boolean
  is_updated: boolean
}

export const VIRAL = 300_000
export const MID = 10_000

export const tierOf = (views: number): ReelRow['tier'] => (views >= VIRAL ? 'VIRAL' : views >= MID ? 'MID' : 'FLOP')

export const tierLabel: Record<ReelRow['tier'], string> = { VIRAL: 'وایرال', MID: 'متوسط', FLOP: 'ضعیف' }

export function reelCode(url: string) {
  const match = url.match(/reel\/([^/?#]+)/)
  if (match) return match[1]
  if (url.includes('/p/')) return url
  return url
}

export function emptyDb(): ReelsDb {
  return { active_account: 'Default', accounts: { Default: { last_updated: 'Never', items: {} } } }
}

/** Copy of the shape rules in `load_local_db`; every missing field gets the Python default. */
export function normalizeDb(raw: unknown): ReelsDb {
  const db = (raw ?? {}) as Partial<ReelsDb>
  const accounts: Record<string, Account> = {}
  for (const [name, value] of Object.entries(db.accounts ?? {})) {
    accounts[name] = { last_updated: value?.last_updated ?? 'Never', items: value?.items ?? {} }
  }
  if (Object.keys(accounts).length === 0) accounts.Default = { last_updated: 'Never', items: {} }
  const active = db.active_account && accounts[db.active_account] ? db.active_account : Object.keys(accounts)[0]
  return { active_account: active, accounts }
}

export function itemToRow(id: string, item: ReelItem): ReelRow {
  const stats = item.last_stats ?? { views: 0, followers: 0, share: 0, save: 0 }
  return {
    id,
    reelCode: reelCode(item.url ?? ''),
    url: item.url ?? '',
    date: item.date ?? '',
    views: stats.views ?? 0,
    followers: stats.followers ?? 0,
    share: stats.share ?? 0,
    save: stats.save ?? 0,
    tier: tierOf(stats.views ?? 0),
    caption: item.caption ?? '',
    content: item.content ?? '',
    prediction: item.prediction ?? '',
    is_flopped: Boolean(item.is_flopped),
    is_new: Boolean(item.is_new),
    is_updated: Boolean(item.is_updated),
  }
}

export function accountRows(account: Account): ReelRow[] {
  return Object.entries(account.items).map(([id, item]) => itemToRow(id, item))
}

const number = (value: string | undefined) => {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

const URL_KEYS = ['permalink', 'post permalink', 'post', 'url', 'link']
const DATE_KEYS = ['publish time', 'date', 'pub_date']
const VIEW_KEYS = ['views', 'view']
const FOLLOW_KEYS = ['follows', 'followers']
const SHARE_KEYS = ['shares', 'share']
const SAVE_KEYS = ['saves', 'save']
const CAPTION_KEYS = ['description', 'caption', 'text']

const pick = (row: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key]
    if (value != null && value !== '') return value
  }
  return ''
}

export interface CsvImportResult {
  db: ReelsDb
  newCount: number
  updatedCount: number
  usedColumns: Record<string, string | null>
}

/**
 * Port of `import_csv`: merge a Meta reels CSV into the active account.
 * Manual fields (content, prediction, is_flopped) survive; caption is always replaced.
 */
export function mergeCsv(db: ReelsDb, table: string[][]): CsvImportResult {
  const header = (table[0] ?? []).map((cell) => cell.trim())
  const index = new Map(header.map((name, position) => [name.toLowerCase(), position]))
  const column = (keys: string[]) => {
    for (const key of keys) {
      const position = index.get(key)
      if (position != null) return { name: header[position], position }
    }
    return null
  }

  const urlCol = column(URL_KEYS)
  const dateCol = column(DATE_KEYS)
  const viewCol = column(VIEW_KEYS)
  const followCol = column(FOLLOW_KEYS)
  const shareCol = column(SHARE_KEYS)
  const saveCol = column(SAVE_KEYS)
  const captionCol = column(CAPTION_KEYS)

  if (!urlCol && !viewCol) throw new Error('هیچ ستون لینک یا ویویی در CSV پیدا نشد.')

  const next: ReelsDb = structuredClone(db)
  const account = next.accounts[next.active_account]
  let newCount = 0
  let updatedCount = 0

  for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
    const cells = table[rowIndex]
    if (!cells || cells.every((cell) => cell === '')) continue

    const url = urlCol ? (cells[urlCol.position] ?? '').trim() : ''
    const key = url ? reelCode(url) || `row_${rowIndex}` : `row_${rowIndex}`
    const date = dateCol ? (cells[dateCol.position] ?? '').trim() : ''
    const caption = captionCol ? (cells[captionCol.position] ?? '').trim() : ''
    const stats: ReelStats = {
      views: viewCol ? number(cells[viewCol.position]) : 0,
      followers: followCol ? number(cells[followCol.position]) : 0,
      share: shareCol ? number(cells[shareCol.position]) : 0,
      save: saveCol ? number(cells[saveCol.position]) : 0,
    }

    const previous = account.items[key]
    if (!previous) {
      newCount += 1
      account.items[key] = {
        url: url || `https://www.instagram.com/reel/${key}/`,
        date,
        caption,
        content: '',
        prediction: '',
        is_flopped: false,
        is_new: true,
        is_updated: false,
        last_stats: stats,
      }
      continue
    }

    const changed =
      previous.last_stats?.views !== stats.views ||
      previous.last_stats?.followers !== stats.followers ||
      previous.last_stats?.share !== stats.share ||
      previous.last_stats?.save !== stats.save
    const wasUpdated = Boolean(previous.is_updated)
    if (changed) updatedCount += 1
    account.items[key] = {
      ...previous,
      url: url || previous.url,
      date: date && date !== 'N/A' ? date : previous.date,
      caption,
      content: previous.content ?? '',
      prediction: previous.prediction ?? '',
      is_flopped: Boolean(previous.is_flopped),
      is_new: false,
      is_updated: changed || wasUpdated,
      last_stats: stats,
    }
  }

  account.last_updated = new Date().toISOString().slice(0, 19).replace('T', ' ')
  return {
    db: next,
    newCount,
    updatedCount,
    usedColumns: {
      url: urlCol?.name ?? null,
      views: viewCol?.name ?? null,
      caption: captionCol?.name ?? null,
    },
  }
}

export interface ContentImportResult {
  db: ReelsDb
  updated: number
  notFound: number
}

/** Port of `import_content_json`; only reels that already exist are updated. */
export function applyContentJson(db: ReelsDb, parsed: unknown): ContentImportResult {
  if (!Array.isArray(parsed)) throw new Error('ریشهٔ JSON باید یک آرایه باشد.')
  const next: ReelsDb = structuredClone(db)
  const account = next.accounts[next.active_account]
  let updated = 0
  let notFound = 0

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const id = String(record.reelsId ?? record.reelId ?? record.reels_id ?? record.id ?? '').trim()
    if (!id) continue
    const text = String(record.content ?? record.conetnt ?? '').trim()
    if (!account.items[id]) {
      notFound += 1
      continue
    }
    account.items[id] = { ...account.items[id], content: text }
    updated += 1
  }

  if (updated > 0) account.last_updated = new Date().toISOString().slice(0, 19).replace('T', ' ')
  return { db: next, updated, notFound }
}

const tierBadge = (views: number) => (views >= VIRAL ? '🔥 [VIRAL]' : views >= MID ? '⚡ [MID]' : '❌ [FLOP]')

/** Port of `export_report`; same field order and tier thresholds. */
export function buildReport(accountName: string, rows: ReelRow[]) {
  const lines = [
    '==========================================',
    `  INSTAGRAM REELS REPORT [${accountName.toUpperCase()}]`,
    '==========================================\n',
  ]
  rows.forEach((row, index) => {
    const flag = row.is_flopped ? ' (⚠️ Manual Flop Candidate)' : ''
    lines.push(`${tierBadge(row.views)} Reel #${index + 1}${flag}`)
    lines.push(` Reel ID: ${row.reelCode}`)
    lines.push(` URL: ${row.url}`)
    lines.push(` Date: ${row.date}`)
    lines.push(` Views: ${row.views.toLocaleString('en-US')} | Followers Gained: +${row.followers.toLocaleString('en-US')}`)
    lines.push(` Shares: ${row.share.toLocaleString('en-US')} | Saves: ${row.save.toLocaleString('en-US')}`)
    lines.push(` Caption: ${row.caption || 'N/A'}`)
    lines.push(` Manual Content: ${row.content || 'N/A'}`)
    lines.push(` AI Prediction: ${row.prediction || 'N/A'}\n`)
  })
  return lines.join('\n')
}

export function summarize(rows: ReelRow[]) {
  const views = rows.map((row) => row.views).sort((a, b) => a - b)
  const total = views.reduce((sum, value) => sum + value, 0)
  const median = views.length ? views[Math.floor(views.length / 2)] : 0
  return {
    count: rows.length,
    total,
    median,
    viral: rows.filter((row) => row.tier === 'VIRAL').length,
    mid: rows.filter((row) => row.tier === 'MID').length,
    flop: rows.filter((row) => row.tier === 'FLOP').length,
    followers: rows.reduce((sum, row) => sum + row.followers, 0),
    saves: rows.reduce((sum, row) => sum + row.save, 0),
    shares: rows.reduce((sum, row) => sum + row.share, 0),
    flopped: rows.filter((row) => row.is_flopped).length,
    newCount: rows.filter((row) => row.is_new).length,
    updatedCount: rows.filter((row) => row.is_updated).length,
  }
}
