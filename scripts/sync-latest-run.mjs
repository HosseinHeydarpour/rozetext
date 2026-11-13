import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Copies the newest data/runs/<date> archive into data/exports so the snapshot build
// always reads the latest collection. Missing files in the run are left untouched.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUNS = path.join(ROOT, 'data', 'runs')
const EXPORTS = path.join(ROOT, 'data', 'exports')

const copies = [
  ['meta-suite/content-table.csv', 'content-table.csv'],
  ['meta-suite/content-table.json', 'content-table.json'],
  ['meta-suite/audience/audience-demographics.csv', 'audience/audience-demographics.csv'],
  ['meta-suite/audience/audience-trends.json', 'audience/audience-trends.json'],
  ['meta-suite/audience/top-content-formats.csv', 'audience/top-content-formats.csv'],
  ['meta-suite/insights/insights-content-interactions.csv', 'insights/insights-content-interactions.csv'],
  ['meta-suite/insights/insights-link-clicks.csv', 'insights/insights-link-clicks.csv'],
  ['meta-suite/insights/insights-reach.csv', 'insights/insights-reach.csv'],
  ['meta-suite/insights/insights-views.csv', 'insights/insights-views.csv'],
  ['dashboard/insights-account.json', '../insights-account.json'],
]

if (!fs.existsSync(RUNS)) {
  console.log(JSON.stringify({ ok: false, reason: 'no runs folder' }))
  process.exit(0)
}

const runs = fs
  .readdirSync(RUNS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
  .map((entry) => entry.name)
  .sort()

if (runs.length === 0) {
  console.log(JSON.stringify({ ok: false, reason: 'no dated run' }))
  process.exit(0)
}

const latest = runs[runs.length - 1]
const source = path.join(RUNS, latest)
const copied = []

for (const [from, to] of copies) {
  const src = path.join(source, from)
  if (!fs.existsSync(src)) continue
  const dest = path.join(EXPORTS, to)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  copied.push(to)
}

// the big per-post export keeps its campaign filename, the snapshot picks the newest csv
const suite = path.join(source, 'meta-suite')
if (fs.existsSync(suite)) {
  const csv = fs
    .readdirSync(suite)
    .filter((name) => name.endsWith('.csv') && !name.startsWith('content-table'))
    .sort()
    .pop()
  if (csv) {
    fs.copyFileSync(path.join(suite, csv), path.join(EXPORTS, csv))
    copied.push(csv)
  }
}

console.log(JSON.stringify({ ok: true, run: latest, copied }))
