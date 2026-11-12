# rozetext dashboard (prototype)

A local dashboard for the rozetext.ir page: React, TypeScript, Tailwind and MUI.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

From the repo root:

```bash
npm run dashboard:data   # rebuild src/data/snapshot.json from ../data
npm run dashboard:dev
npm run dashboard:build
```

## Data

`src/data/snapshot.json` is generated from the repo's `data/` exports by `scripts/build-dashboard-data.mjs`. Nothing in the UI is hardcoded except labels; every number comes from that snapshot. Rebuild it after a new data collection.

## Direction

Read `DESIGN.md` before changing the interface. The short version: paper and ink, Naskh numerals, one pomegranate accent, no gradients, no glass, no fabricated metrics.
