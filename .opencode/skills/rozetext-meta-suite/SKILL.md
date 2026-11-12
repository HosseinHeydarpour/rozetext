---
name: rozetext-meta-suite
description: "Open Meta Business Suite for the rozetext page and sign in through Facebook. Human-paced, handles the 2FA code, keeps the session. Load when the task needs Business Suite data, inbox, content planning, or page analytics."
---

# rozetext-meta-suite

## When to use

Work that lives in Meta Business Suite: page inbox, content calendar, page-level analytics, audience data, ads overview. For the Instagram professional dashboard use `rozetext-dashboard-data`; for the account session use `rozetext-login`.

## Credentials

- `FB_PHONE` and `FB_PASSWORD` live in `.env`, which is gitignored.
- Never print, echo, commit or move the password into a skill file.
- The login is Facebook-based (`business.facebook.com`), not Instagram.

## Run

```bash
npm run meta:suite
```

- `--manual` opens Chrome without filling the form, for when the password is uncertain.
- `--keep-open` holds the window for 15 minutes.
- `--force` bypasses the lock after a rejected password.
- Progress: `runtime/meta-suite.json` with states `opening`, `login`, `submitted`, `needs_2fa`, `needs_human`, `ok`, `error`.
- Session: `runtime/meta-state.json`; cookies live in the Chrome profile.
- Screenshots: `runtime/meta-suite.png`, `runtime/meta-suite-error.png`.

## 2FA

On `needs_2fa`, ask the user for the 6-digit code and write it to `runtime/meta-2fa.txt`. The script submits it and deletes the file. Three codes maximum, then it stops.

## Human behaviour (mandatory)

- Headed Chrome only, one window per profile, never parallel.
- Random pauses 0.5–2.5 seconds between actions, human-paced typing.
- One login attempt per request. A rejected password writes `runtime/meta-blocked.json` and exits; do not retry, do not try variants.
- The script is read-only by default: it never posts, schedules, replies or spends ad budget on its own.

## Session

- Same Chrome profile as `rozetext-login`: `%LOCALAPPDATA%\rozetext\chrome-profile`.
- A valid Facebook session (`c_user` cookie) skips the form and exits `ok`.
- If the session expires or Facebook asks for a checkpoint, rerun once and handle `needs_human` with the user in the window.

## No session: ask for one

When the script reports `needs_session`, stop and ask the user for a session. Do not ask for the password in chat.

1. User exports `facebook.com` cookies from their own Chrome (Cookie-Editor → Export → JSON).
2. Save as `runtime/fb-cookies.json` (gitignored).
3. Run `node scripts/meta-import-cookies.mjs`; it imports, verifies `c_user`, and deletes the file.
4. Rerun the requested task.

## Export Instagram posts

`npm run meta:export` performs the Content → Export data flow:

1. Opens `business.facebook.com/latest/posts`.
2. Checks the session; `needs_session` if there is no `c_user`.
3. Clicks **Export data**.
4. Selects the **Instagram** tab.
5. Selects the **rozetext.ir** account.
6. Sets the date range **Aug 1, 2026 → today** (calendar months are navigated with previous/next).
7. Keeps content level **Post** (videos, carousels, photos).
8. Clicks **Generate**.
9. Waits up to 10 minutes for the export to reach **100% / Completed**, reloading the page and reopening the export panel every **45 seconds** so the percentage updates.
10. Sets Chrome's download behavior through CDP and clicks the row's download icon. It ignores `.crdownload` files and waits for the final file's size to stabilize before saving it to `data/exports/`.

Status goes to `runtime/meta-export.json`: `opening`, `needs_session`, `generated`, `downloaded`, `needs_download`, `error`.

Output: a CSV with `Post ID, Account username, Description, Duration, Publish time, Permalink, Post type, Views, Reach, Likes, Shares, Follows, Comments, Saves`.

Fallback: if no file appears within 60 seconds, the state is `needs_download`; the export is ready in **Recent exports** and needs one click. Do not repeat the whole export just for that.

## Export the four Results charts

`npm run meta:insights` opens `business.facebook.com/latest/insights/results`, selects **Instagram** in the entity selector, and exports the four visible charts as CSV:

- Views
- Reach
- Content interactions
- Link clicks

Each chart has an **Export** dropdown; the script picks **Export as csv** and saves the files to `data/exports/insights/` as `insights-views.csv`, `insights-reach.csv`, `insights-content-interactions.csv`, `insights-link-clicks.csv`.

Status: `runtime/meta-insights.json` (`opening`, `chart-exported`, `done`, `needs_session`, `error`). If the page keeps the Facebook entity after navigation, select Instagram on the Results page itself; the URL then contains `platform=Instagram`.

## Audience and content formats

`npm run meta:audience` covers the rest of the Insights tabs:

1. Results → Instagram → **Audience**.
2. **Demographics**: Export → Export as csv → `data/exports/audience/audience-demographics.csv`.
3. **Trends**: not exportable. The script reads the page and saves the daily follows series, totals and raw text to `data/exports/audience/audience-trends.json`.
4. Insights → Content → Overview (`/latest/insights/content_summary`), scroll to **Top content formats**, Export → Export as csv → `top-content-formats.csv`.

Status: `runtime/meta-audience.json` (`opening`, `demographics`, `trends`, `done`, `needs_session`, `error`).

If the Audience page shows **You are currently offline**, click Refresh and wait; demographics need the connection.

## Human behaviour

- Headed Chrome, one window, human pauses; never loop the export.
- One export per day unless the user asks again.
- Read-only: no posts, comments, ads or settings changes.
