import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const EXPORTS = path.join(ROOT, 'data', 'exports')
const OUT = path.join(ROOT, 'dashboard', 'src', 'data', 'snapshot.json')

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else quoted = false
      } else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }
  return rows
}

const num = (value) => {
  if (value == null) return null
  const clean = String(value).replace(/[,\s%]/g, '')
  if (!clean || clean === '--' || clean === '‑‑') return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}

function readText(file) {
  const buffer = fs.readFileSync(file)
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.subarray(2).toString('utf16le')
  let zeros = 0
  for (let i = 0; i < Math.min(buffer.length, 2000); i += 1) if (buffer[i] === 0) zeros += 1
  if (zeros > 200) return buffer.toString('utf16le')
  return buffer.toString('utf8').replace(/^\uFEFF/, '')
}

const latestPostsCsv = fs
  .readdirSync(EXPORTS)
  .filter((name) => /^Aug-\d{2}-\d{4}_.*\.csv$/.test(name))
  .map((name) => ({ name, mtime: fs.statSync(path.join(EXPORTS, name)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)[0]

const postRows = latestPostsCsv ? parseCsv(readText(path.join(EXPORTS, latestPostsCsv.name))) : []
const postHeader = postRows[0] || []
const posts = postRows.slice(1).filter((row) => row.length > 1).map((row) => {
  const record = Object.fromEntries(postHeader.map((key, index) => [key, row[index] ?? '']))
  return {
    id: record['Post ID'],
    caption: record.Description,
    publishedAt: record['Publish time'],
    permalink: record.Permalink,
    type: record['Post type'],
    views: num(record.Views),
    reach: num(record.Reach),
    likes: num(record.Likes),
    comments: num(record.Comments),
    shares: num(record.Shares),
    saves: num(record.Saves),
    follows: num(record.Follows),
  }
})

const RANGES = [
  { slug: 'yesterday', label: 'دیروز' },
  { slug: 'last-7-days', label: '۷ روز' },
  { slug: 'last-28-days', label: '۲۸ روز' },
  { slug: 'last-90-days', label: '۹۰ روز' },
  { slug: 'this-week', label: 'این هفته' },
  { slug: 'this-month', label: 'این ماه' },
  { slug: 'this-year', label: 'امسال' },
]

function parseSeries(slug, metric) {
  const file = path.join(EXPORTS, 'ranges', `insights-${metric}-${slug}.csv`)
  if (!fs.existsSync(file)) return []
  const lines = readText(file).split(/\r?\n/).filter(Boolean)
  const series = []
  for (const line of lines) {
    const match = line.match(/^"(\d{4}-\d{2}-\d{2})[^"]*","?([\d.]+)"?/)
    if (match) series.push({ date: match[1], value: Number(match[2]) })
  }
  return series
}

const ranges = {}
for (const range of RANGES) {
  const series = {
    views: parseSeries(range.slug, 'views'),
    reach: parseSeries(range.slug, 'reach'),
    interactions: parseSeries(range.slug, 'content-interactions'),
    linkClicks: parseSeries(range.slug, 'link-clicks'),
  }
  const sum = (items) => items.reduce((total, item) => total + (item.value || 0), 0)
  ranges[range.slug] = {
    label: range.label,
    series,
    totals: {
      views: sum(series.views),
      reach: sum(series.reach),
      interactions: sum(series.interactions),
      linkClicks: sum(series.linkClicks),
    },
  }
}

const trendsFile = fs.existsSync(path.join(EXPORTS, 'ranges', 'audience-trends-last-28-days.json'))
  ? path.join(EXPORTS, 'ranges', 'audience-trends-last-28-days.json')
  : path.join(EXPORTS, 'audience', 'audience-trends.json')
const trends = JSON.parse(fs.readFileSync(trendsFile, 'utf8'))
const views28 = ranges['last-28-days'].series.views
const followsDaily = (trends.daily_follows || []).map((value, index) => ({
  date: views28[index]?.date ?? null,
  value,
}))

const demographicsRows = parseCsv(readText(path.join(EXPORTS, 'audience', 'audience-demographics.csv')))
const sectionIndex = (name) => demographicsRows.findIndex((row) => row[0] === name)
const ageStart = sectionIndex('Age & gender')
const cityStart = sectionIndex('Top cities')
const countryStart = sectionIndex('Top countries')

const ageGender = []
if (ageStart >= 0) {
  for (let i = ageStart + 2; i < demographicsRows.length; i += 1) {
    const row = demographicsRows[i]
    if (!row[0] || row[0].startsWith('Top ')) break
    ageGender.push({ bucket: row[0], men: Number(row[1] || 0), women: Number(row[2] || 0) })
  }
}

const cityFa = {
  Semnan: 'سمنان',
  Yasuj: 'یاسوج',
  Mashhad: 'مشهد',
  Tehran: 'تهران',
  Dezful: 'دزفول',
  Tabriz: 'تبریز',
  Ahvaz: 'اهواز',
  Shiraz: 'شیراز',
  Isfahan: 'اصفهان',
  Maku: 'ماکو',
}

const countryFa = {
  Iran: 'ایران',
  Afghanistan: 'افغانستان',
  Germany: 'آلمان',
  'United States': 'آمریکا',
  Turkey: 'ترکیه',
  Iraq: 'عراق',
  Canada: 'کانادا',
  'United Kingdom': 'بریتانیا',
  Sweden: 'سوئد',
  Australia: 'استرالیا',
}

const cities = []
if (cityStart >= 0) {
  const names = demographicsRows[cityStart + 1] || []
  const values = demographicsRows[cityStart + 2] || []
  names.forEach((name, index) => {
    if (!name) return
    const city = name.split(',')[0]
    cities.push({ name: cityFa[city] ?? city, pct: Number(values[index] || 0) })
  })
}

const countries = []
if (countryStart >= 0) {
  const names = demographicsRows[countryStart + 1] || []
  const values = demographicsRows[countryStart + 2] || []
  names.forEach((name, index) => {
    if (!name) return
    countries.push({ name: countryFa[name] ?? name, pct: Number(values[index] || 0) })
  })
}

const genderRow = demographicsRows.find((row) => row[0] === 'Men' || row[0] === 'Women')
const formatsRows = parseCsv(readText(path.join(EXPORTS, 'audience', 'top-content-formats.csv')))
const formatsHeader = formatsRows.find((row) => row[0] === 'Published content')
const formats = { posts: 0, stories: 0 }
if (formatsHeader) {
  const index = formatsRows.indexOf(formatsHeader)
  formats.posts = Number(formatsRows[index + 2]?.[0] || 0)
  formats.stories = Number(formatsRows[index + 2]?.[1] || 0)
}

const contentTable = fs.existsSync(path.join(EXPORTS, 'content-table.json'))
  ? JSON.parse(fs.readFileSync(path.join(EXPORTS, 'content-table.json'), 'utf8'))
  : { rows: [] }

const insights = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'insights-account.json'), 'utf8'))
const insight30 = insights.ranges['30']?.parsed || {}
const savesTotal = posts.reduce((total, post) => total + (post.saves || 0), 0)
const viewsTotal = posts.reduce((total, post) => total + (post.views || 0), 0)

const topBySaves = [...posts].sort((a, b) => (b.saves || 0) - (a.saves || 0)).slice(0, 6)
const topByViews = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6)

const snapshot = {
  generated_at: new Date().toISOString(),
  account: {
    username: 'rozetext.ir',
    followers: num(insight30.followers_total) || 96394,
    posts: posts.length,
  },
  kpis: {
    views28: ranges['last-28-days'].totals.views,
    accountsEngaged: insight30.interactions?.accounts_engaged ?? null,
    interactions28: ranges['last-28-days'].totals.interactions,
    reach28: ranges['last-28-days'].totals.reach,
    savesTotal,
    viewsTotal,
    saveRate: viewsTotal ? savesTotal / viewsTotal : 0,
    followersPct: insight30.views?.followers_pct ?? null,
    nonFollowersPct: insight30.views?.non_followers_pct ?? null,
    viewers28: insight30.views?.viewers ?? null,
    profileVisits: insight30.profile_visits ?? null,
  },
  ranges,
  follows: {
    total: trends.follows,
    unfollows: trends.unfollows,
    followersLifetime: trends.followers_lifetime,
    daily: followsDaily,
  },
  demographics: {
    ageGender,
    cities,
    countries,
    men: genderRow ? Number(genderRow[1] || 0) : 57.2,
    women: genderRow ? Number(genderRow[2] || 0) : 42.8,
  },
  formats,
  recentContent: contentTable.rows,
  topBySaves,
  topByViews,
  activeTimes: insight30.active_times?.days || {},
  activeTimesBest: insight30.active_times?.best ?? null,
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2))
console.log(JSON.stringify({ out: path.relative(ROOT, OUT), posts: posts.length, ranges: RANGES.length, cities: cities.length, countries: countries.length, ageBuckets: ageGender.length }))
