---
name: rozetext-data
description: "Run the daily rozetext data collection: the dashboard snapshot first, then the Meta Business Suite exports, all saved under data/runs/<date>/dashboard and /meta-suite. Load when the user asks to collect or refresh all page data for today."
---

# rozetext-data

One command for the daily snapshot. It runs the other skills' scripts in order and files the results by date.

## Run

```bash
npm run data:collect
```

- `--full` also runs `meta:ranges` (the seven date ranges). It adds roughly ten minutes.
- Status: `runtime/collect-data.json`.
- Manifest: `data/runs/<date>/manifest.json`.

## Order

1. `rozetext-dashboard-data` → `scripts/dashboard-data.mjs` (7/14/30/90 account insights)
2. `rozetext-meta-suite`:
   - `meta-export` (posts CSV)
   - `meta-insights` (four Results charts)
   - `meta-audience` (demographics, trends, top content formats)
   - `meta-content` (watch time table)
   - `meta-ranges` only with `--full`

## Output

```
data/runs/2026-11-12/
├─ manifest.json
├─ dashboard/
│  └─ insights-account.json
└─ meta-suite/
   ├─ Aug-01-2026_Nov-11-2026_<id>.csv
   ├─ content-table.json
   ├─ content-table.csv
   ├─ insights/
   ├─ audience/
   └─ ranges/        (only with --full)
```

- One folder per local date. Running twice on the same day replaces the files in the same folder and updates the manifest.
- `manifest.json` lists every step, its exit code, and every saved file.

## Preconditions

- Instagram session valid for the dashboard (run `rozetext-login` if it expired).
- Facebook session valid for Meta (cookies imported or logged in).
- If a step exits with code `3`, the run stops with `needs_session`, naming the step.

## Human behaviour

- Sequential only, one Chrome profile at a time, never parallel.
- Pauses between steps; the child scripts already pace their own pages.
- One collection per day unless the user asks again.
