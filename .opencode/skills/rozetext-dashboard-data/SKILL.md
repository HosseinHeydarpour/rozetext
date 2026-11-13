---
name: rozetext-dashboard-data
description: "Refresh the rozetext dashboard numbers from Instagram's professional dashboard for the 7, 14, 30 and 90 day ranges. Human-paced, read-only, saves to data/insights-account.json. Load when the user asks for fresh stats or to update the dashboard."
---

# rozetext-dashboard-data

## What it does

Opens Instagram's Account insights in the already logged-in Chrome profile, reads the four ranges, and writes them to `data/insights-account.json` for the dashboard. Read-only: it never likes, follows, posts or sends anything.

Ranges, fixed and recorded: **7, 14, 30, 90 days**.

## Run

```bash
npm run dashboard:data
```

- `--keep-open` keeps Chrome open for 5 minutes so the user can look around.
- `--force` bypasses the 5-minute cooldown.
- Progress is written to `runtime/dashboard-data.json` (`opening`, `range-7`, `range-14`, `range-30`, `range-90`, `done`, `error`).
- Screenshots: `runtime/dashboard-<range>.png`.
- Output: `data/insights-account.json`, one entry per range plus the raw page text.

## Human behaviour (mandatory)

- One page load per range, four in total. Never loop, never reload a range twice in one run.
- Random pauses of 1.8–4.5 seconds between pages, 2.5–4.5 after each load.
- Headed Chrome only. Do not run headless.
- Do not run two copies at once; one Chrome window per profile.
- The script refuses to run twice within 5 minutes unless `--force`. Respect it.
- No parallel tabs, no rapid range switching.

## Data captured

Per range: views (total, follower/non-follower split, viewers), interactions (total, split, accounts engaged), content views split (reels/stories), content interactions split (reels/stories/posts), profile visits, total followers, top content by interactions, and the active-times bars for the default selected day.

Not available on this page: audience demographics (age, gender, city) and a follower-growth chart. Those are app-only or need another screen; do not invent them.

## Encoding

Every file here is UTF-8. Windows PowerShell 5.1 decodes UTF-8 as ANSI, so Persian shows as `U_O...`, and the console cannot render Persian glyphs even after `chcp 65001` (it prints `?????`). That is a viewer problem, not a broken file. Never re-save or transcode a file because a shell shows mojibake.

- Check the bytes instead of the console: `node -e "const fs=require('fs');new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(process.argv[1]))" <file>`. It throws on invalid UTF-8 and prints nothing on success.
- Read Persian output in the editor or the dashboard, not in the terminal.
- Scripts write UTF-8 without BOM: `fs.writeFileSync(path, text, 'utf8')`.
- `data/reports/rozetext-reels-*.md` is exported by the dashboard (`buildReportMarkdown` in `dashboard/src/lib/reels.ts`), not by this skill, and is already UTF-8.

## Session

If the page redirects to `/accounts/login`, the session expired. Stop, tell the user, and load `rozetext-login` before running again. Never ask for the password inside this skill.
