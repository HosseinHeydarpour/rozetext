# rozetext dashboard

A local dashboard for the rozetext.ir page: Next.js (App Router), React, TypeScript and MUI. All UI is Persian and RTL, with light and dark schemes.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

From the repo root:

```bash
npm run dashboard:data   # rebuild src/data/snapshot.json from ../data
npm run dashboard:dev
npm run dashboard:build
```

`next dev`/`next start` must run from this folder: the API reads `../data/main-database/reels_database.json` relative to the working directory.

## Routes

| Route | Screen |
|---|---|
| `/` | overview: KPIs, views, follows, recent posts |
| `/content` | the exported post table |
| `/content/analyzer` | reels analyzer: 512 reels, editing, CSV/JSON import, report |
| `/audience` | demographics |

`/api/reels` reads and writes the analyzer database. Writes go through a temp file and a rename, so a crash cannot leave a half-written JSON.

## Data

- `src/data/snapshot.json` is generated from `data/exports` by `scripts/build-dashboard-data.mjs`. Rebuild it after every data collection.
- `../data/main-database/reels_database.json` is the analyzer store, shaped like the desktop app's file: `active_account` plus `accounts[name].items[reelCode]`. It is not generated; the analyzer edits it.
- `../data/benchmark-accounts/benchmark_accounts.json` feeds `/content/benchmark` through `/api/benchmark`.
- `data/runs/<date>/` holds one folder per collection run. `scripts/sync-latest-run.mjs` copies the newest folder into `data/exports` (meta-suite, audience, insights, dashboard) and leaves anything the run did not include untouched.

### Where each number comes from

| Screen | File | Produced by |
|---|---|---|
| Overview KPIs, ranges, follows | `data/exports/ranges/*` + `data/exports/audience/audience-trends.json` | `scripts/collect-data.mjs` → `meta-ranges.mjs`, `meta-export.mjs` |
| Audience demographics, cities, countries | `data/exports/audience/audience-demographics.csv` | `meta-audience.mjs` |
| Content table | `data/exports/content-table.csv` | `meta-content.mjs` |
| Analyzer | `data/main-database/reels_database.json` | collected once, edited in the analyzer |

`/api/snapshot` serves the current snapshot and `/api/refresh` first runs `scripts/sync-latest-run.mjs` (newest `data/runs/<date>` → `data/exports`), then `build-dashboard-data.mjs`. So the header button picks the latest collection and rebuilds every screen without a redeploy. It does not scrape Instagram: that is `npm run data:collect`, which needs the logged-in browser session.

## Direction

Read `DESIGN.md` before changing the interface. The short version: pixel-level port of the Figma "Material UI Dashboard Screen" file — 16 px cards with the two-layer shadow, 280 px drawer, 80 px blurred header, `#00A76F` primary, Peyda, real data only.
