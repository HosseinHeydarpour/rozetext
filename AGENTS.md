# rozetext

Repo rules for agents working on this project.

## What this repo is

Three parts, one data model:

- `site/` — public media kit for advertisers, built to static `dist/`
- `dashboard/` + `server/` — stats dashboard, runs locally and on a VPS
- `.opencode/skills/rozetext/` — the page's content skill

Read `docs/ARCHITECTURE.md` before structural changes. Read `DESIGN.md` and the page skill before any UI or copy work.

## Stack rules

- Node 22+, ES modules, no build step for server or dashboard.
- No runtime dependencies without asking first. `node:http`, `node:fs`, `node:crypto` and `fetch` are enough.
- Site output is static HTML in `dist/`; that directory is never committed.
- Dashboard and site share `data/*.json`. Do not create a second store.

## Data rules

- Every metric carries its source and `fetched_at`. No invented, estimated or undated numbers.
- Writes are atomic: write `*.tmp`, then rename.
- `posts.json` is keyed by Instagram post id; removed posts get `archived: true`, they are not deleted.
- Missing private metrics stay missing. Do not fill `insights.json` with guesses.

## Secrets

- `BEATAPI_API_KEY`, `DASHBOARD_PASSWORD`, `SESSION_SECRET` come from env only.
- Never put a key in `dashboard/` or `site/` output.
- `.env` is gitignored; `.env.example` documents variable names only.

## Commands

```
npm run dev        # server + dashboard on localhost:4321
npm run sync       # pull fresh Instagram data into data/
npm run build:site # data + site/ -> dist/
npm start          # production server
npm run dashboard:data   # rebuild the dashboard snapshot from data/
npm run dashboard:dev    # React prototype on localhost:5173
npm run dashboard:build  # type-check + build the dashboard
```

## Style

- Site and dashboard: Persian RTL, self-hosted fonts, no CDN.
- Follow antislop while writing UI or copy; the skill is installed globally.
- Commit messages: `area: what changed` (site, dashboard, data, server, skill, docs).
