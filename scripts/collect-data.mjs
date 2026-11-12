import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const RUNTIME = path.join(ROOT, 'runtime')
const RUNS = path.join(ROOT, 'data', 'runs')
const FULL = process.argv.includes('--full')

const now = new Date()
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const runDir = path.join(RUNS, date)
const dashboardDir = path.join(runDir, 'dashboard')
const metaDir = path.join(runDir, 'meta-suite')
const STATUS = path.join(RUNTIME, 'collect-data.json')

fs.mkdirSync(dashboardDir, { recursive: true })
fs.mkdirSync(metaDir, { recursive: true })

const steps = [
  { name: 'dashboard', script: 'scripts/dashboard-data.mjs', args: ['--force'] },
  { name: 'meta-export', script: 'scripts/meta-export.mjs', args: [] },
  { name: 'meta-insights', script: 'scripts/meta-insights.mjs', args: [] },
  { name: 'meta-audience', script: 'scripts/meta-audience.mjs', args: [] },
  { name: 'meta-content', script: 'scripts/meta-content.mjs', args: [] },
]
if (FULL) steps.push({ name: 'meta-ranges', script: 'scripts/meta-ranges.mjs', args: [] })

const manifest = { date, started_at: now.toISOString(), full: FULL, steps: [], files: { dashboard: [], meta_suite: [] } }

function saveStatus(state, detail = {}) {
  fs.writeFileSync(STATUS, JSON.stringify({ state, date, ...detail, updated_at: new Date().toISOString() }, null, 2))
  console.log(JSON.stringify({ state, date, ...detail }))
}

function runStep(step) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [step.script, ...step.args], { cwd: ROOT, stdio: 'inherit' })
    child.on('close', (code) => resolve(code ?? 1))
  })
}

function copyDirContents(source, target) {
  if (!fs.existsSync(source)) return
  fs.cpSync(source, target, { recursive: true })
}

function listFiles(dir) {
  const out = []
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else out.push(path.relative(runDir, full).split(path.sep).join('/'))
    }
  }
  if (fs.existsSync(dir)) walk(dir)
  return out
}

try {
  for (const step of steps) {
    saveStatus('step', { step: step.name })
    const code = await runStep(step)
    manifest.steps.push({ name: step.name, code, at: new Date().toISOString() })

    if (step.name === 'dashboard') {
      const source = path.join(ROOT, 'data', 'insights-account.json')
      if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dashboardDir, 'insights-account.json'))
    } else if (step.name === 'meta-export') {
      const root = path.join(ROOT, 'data', 'exports')
      const newest = fs
        .readdirSync(root)
        .filter((name) => /^Aug-\d{2}-\d{4}_.*\.csv$/i.test(name))
        .map((name) => ({ name, mtime: fs.statSync(path.join(root, name)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)[0]
      if (newest) fs.copyFileSync(path.join(root, newest.name), path.join(metaDir, newest.name))
    } else if (step.name === 'meta-insights') {
      const source = path.join(ROOT, 'data', 'exports', 'insights')
      if (fs.existsSync(source)) fs.cpSync(source, path.join(metaDir, 'insights'), { recursive: true })
    } else if (step.name === 'meta-audience') {
      const source = path.join(ROOT, 'data', 'exports', 'audience')
      if (fs.existsSync(source)) fs.cpSync(source, path.join(metaDir, 'audience'), { recursive: true })
    } else if (step.name === 'meta-content') {
      for (const name of ['content-table.json', 'content-table.csv']) {
        const source = path.join(ROOT, 'data', 'exports', name)
        if (fs.existsSync(source)) fs.copyFileSync(source, path.join(metaDir, name))
      }
    } else if (step.name === 'meta-ranges') {
      const source = path.join(ROOT, 'data', 'exports', 'ranges')
      if (fs.existsSync(source)) fs.cpSync(source, path.join(metaDir, 'ranges'), { recursive: true })
    }

    if (code === 3) {
      saveStatus('needs_session', { step: step.name })
      break
    }

    await new Promise((r) => setTimeout(r, 4000 + Math.floor(Math.random() * 4000)))
  }

  manifest.finished_at = new Date().toISOString()
  manifest.files.dashboard = listFiles(dashboardDir)
  manifest.files.meta_suite = listFiles(metaDir)
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  saveStatus('done', { folder: path.relative(ROOT, runDir), dashboard_files: manifest.files.dashboard.length, meta_files: manifest.files.meta_suite.length })
} catch (error) {
  saveStatus('error', { message: error.message })
  process.exitCode = 2
}
