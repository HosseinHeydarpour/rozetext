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

`next dev`/`next start` must run from this folder: the API reads `../data/reels_database.json` relative to the working directory.

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
- `../data/reels_database.json` is the analyzer store, shaped like the desktop app's file: `active_account` plus `accounts[name].items[reelCode]`. It is not generated; the analyzer edits it.

## Direction

Read `DESIGN.md` before changing the interface. The short version: pixel-level port of the Figma "Material UI Dashboard Screen" file — 16 px cards with the two-layer shadow, 280 px drawer, 80 px blurred header, `#00A76F` primary, Peyda, real data only.
