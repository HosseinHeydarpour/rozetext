import fs from 'node:fs'
import path from 'node:path'

// Schedules confirmed hunted texts into the follower-active windows.
// Score picks the window order; theme fit only breaks a near-tie.

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA = path.join(ROOT, 'data')
const HUNT = path.join(DATA, 'hunted-candidates')
const PLANS = path.join(DATA, 'content-hunt', 'plans')
const INSIGHTS = path.join(DATA, 'insights-account.json')

const flag = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const int = (value, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback
}

const HOURS = [
  { key: '12a', start: '00:00', window: '00:00-02:59', archetype: 'سکوت شب', primary: ['غم/تنهایی', 'دوری/جدایی'], secondary: ['غرور/مرز', 'عشق/رابطه'] },
  { key: '3a', start: '03:00', window: '03:00-05:59', archetype: 'بغض نیمه‌شب', primary: ['غم/تنهایی', 'غرور/مرز'], secondary: ['کارما/عدالت', 'دوری/جدایی'] },
  { key: '6a', start: '06:00', window: '06:00-08:59', archetype: 'شروع دوباره', primary: ['امید', 'آرامش/پذیرش', 'خودشناسی'], secondary: ['عشق/رابطه'] },
  { key: '9a', start: '09:00', window: '09:00-11:59', archetype: 'انرژی روز', primary: ['خودشناسی', 'غرور/مرز', 'کارما/عدالت'], secondary: ['عشق/رابطه', 'امید'] },
  { key: '12p', start: '12:00', window: '12:00-14:59', archetype: 'ارتباط', primary: ['عشق/رابطه', 'مادر/خانواده', 'رفاقت'], secondary: ['آرامش/پذیرش'] },
  { key: '3p', start: '15:00', window: '15:00-17:59', archetype: 'خستگی عصر', primary: ['غم/تنهایی', 'دوری/جدایی', 'آرامش/پذیرش'], secondary: ['عشق/رابطه'] },
  { key: '6p', start: '18:00', window: '18:00-20:59', archetype: 'خانه', primary: ['مادر/خانواده', 'عشق/رابطه'], secondary: ['آرامش/پذیرش', 'رفاقت'] },
  { key: '9p', start: '21:00', window: '21:00-23:59', archetype: 'خداحافظی', primary: ['دوری/جدایی', 'غرور/مرز'], secondary: ['غم/تنهایی', 'کارما/عدالت', 'عشق/رابطه'] },
]

const DAY = { Sun: 'Su', Mon: 'M', Tue: 'Tu', Wed: 'W', Thu: 'Th', Fri: 'F', Sat: 'Sa' }

function fail(message) {
  console.error(message)
  process.exit(1)
}

function tehranToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function defaultDate() {
  const today = new Date(`${tehranToday()}T12:00:00Z`)
  today.setUTCDate(today.getUTCDate() + 1)
  return today.toISOString().slice(0, 10)
}

function latestCandidates() {
  if (!fs.existsSync(HUNT)) fail('no hunted-candidates folder')
  const dates = fs.readdirSync(HUNT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse()
  for (const date of dates) {
    const file = path.join(HUNT, date, 'candidates.json')
    if (fs.existsSync(file)) return file
  }
  fail('no daily candidates file')
}

function fit(theme, hour) {
  if (hour.primary.includes(theme)) return 1
  if (hour.secondary.includes(theme)) return 0.6
  return 0.2
}

const date = flag('date') || defaultDate()
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`--date must be YYYY-MM-DD, got ${date}`)

const insights = JSON.parse(fs.readFileSync(INSIGHTS, 'utf8'))
const active = insights.ranges?.['7']?.parsed?.active_times
if (!active?.days) fail('active hours missing: data/insights-account.json ranges.7.parsed.active_times.days')

const weekday = DAY[new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Tehran' }).format(new Date(`${date}T12:00:00Z`))]
const dayHours = active.days[weekday]
const hours = dayHours
  ? dayHours
  : Object.fromEntries(HOURS.map((hour) => [
      hour.key,
      Math.round(Object.values(active.days).reduce((sum, day) => sum + (day[hour.key] || 0), 0) / Object.keys(active.days).length),
    ]))

const sourceFile = flag('candidates') || latestCandidates()
const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'))
const candidates = (source.candidates ?? []).filter((item) => item.confirmed === true && Number.isFinite(item.score))
if (!candidates.length) {
  console.log('no confirmed candidates')
  process.exit(0)
}

const ranked = HOURS
  .map((hour) => ({ ...hour, activity: hours[hour.key] ?? 0 }))
  .sort((a, b) => b.activity - a.activity)

const max = ranked[0].activity
if (!max) fail('active hours are all zero')
const usable = ranked.filter((hour) => hour.activity >= max * 0.4)
const capacity = Math.min(int(flag('capacity'), 6), usable.length)
const slots = usable.slice(0, capacity)
const total = HOURS.reduce((sum, hour) => sum + (hours[hour.key] || 0), 0)

const remaining = [...candidates].sort((a, b) => b.score - a.score)
const assigned = []
const tiers = [slots.slice(0, 3), slots.slice(3, 6), slots.slice(6, 8)]
let budget = slots.length

for (const [tierIndex, tier] of tiers.entries()) {
  if (budget <= 0 || !remaining.length) break
  const count = Math.min(tier.length, remaining.length, budget)
  const batch = remaining.splice(0, count)
  const available = [...tier]

  for (const candidate of batch) {
    let best = available[0]
    for (const slot of available) {
      const current = fit(candidate.theme, slot)
      const bestFit = fit(candidate.theme, best)
      if (current > bestFit || (current === bestFit && slot.activity > best.activity)) best = slot
    }
    available.splice(available.indexOf(best), 1)
    const themeFit = fit(candidate.theme, best)
    assigned.push({
      key: best.key,
      start: best.start,
      window: best.window,
      archetype: best.archetype,
      tier: tierIndex + 1,
      activity: best.activity,
      activity_share: Number((best.activity / total).toFixed(3)),
      shortcode: candidate.shortcode,
      score: candidate.score,
      theme: candidate.theme,
      theme_fit: themeFit,
      caption: candidate.caption ?? '',
      content: candidate.content ?? '',
      source_url: candidate.source_url ?? '',
      reasons: [
        `score ${candidate.score}`,
        `theme fit ${themeFit}`,
        `tier ${tierIndex + 1}`,
        `activity ${best.activity}`,
      ],
    })
  }

  budget -= count
}

assigned.sort((a, b) => b.activity - a.activity)
assigned.forEach((slot, index) => { slot.rank = index + 1 })

const plan = {
  date,
  timezone: 'Asia/Tehran',
  capacity,
  source_file: path.relative(ROOT, sourceFile).split(path.sep).join('/'),
  activity_source: `data/insights-account.json ranges.7.parsed.active_times.${dayHours ? `days.${weekday}` : 'days.average'}`,
  activity_fetched_at: insights.fetched_at ?? null,
  generated_at: new Date().toISOString(),
  slots: assigned,
  unscheduled: remaining.map((item) => ({ shortcode: item.shortcode, score: item.score, reason: 'capacity' })),
}

const outFile = flag('out') || path.join(PLANS, `${date}.json`)
fs.mkdirSync(path.dirname(outFile), { recursive: true })
const tmp = `${outFile}.tmp`
fs.writeFileSync(tmp, JSON.stringify(plan, null, 2), 'utf8')
fs.renameSync(tmp, outFile)

console.log(`plan ${date} | ${assigned.length} slots | ${plan.unscheduled.length} unscheduled`)
for (const slot of assigned) console.log(`${slot.window} | ${slot.archetype} | ${slot.score} | ${slot.shortcode} | fit ${slot.theme_fit}`)
console.log(`written ${path.relative(ROOT, outFile)}`)
