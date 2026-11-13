---
name: rozetext-data-collect-account-login
description: "Separate Instagram session for the data-collection (burner) account. Logs in with its own credentials or imports a session into its own Chrome profile, so the main @rozetext.ir session is never replaced. Load when a task could put the page account at risk or needs a second account."
---

# rozetext-data-collect-account-login

## When to use

For reads that could get an account flagged: bulk profile or post scraping, hashtag and explore walks, follower lists, story views, experiments.

Not for the page's own private data (insights, inbox, comments on @rozetext.ir). That needs the page session and `rozetext-login`. The burner is a different account: it sees public data only, and its view of the page is not the page's analytics.

Posting, DMs, follows and comments stay off limits from this account. It is a reader.

## Credentials

- `IG_COLLECT_USERNAME`, `IG_COLLECT_PASSWORD` and `IG_COLLECT_PROFILE_DIR` live in `.env`.
- Never reuse or overwrite `IG_USERNAME` / `IG_PASSWORD`; those belong to the page session.
- If the user pastes credentials in chat, write them to `.env`, never print the password back, and suggest rotating it afterwards.
- If the collect credentials are missing, ask once. Never guess a password and never borrow the page's.

## Run

1. Check `runtime/collect-login-blocked.json`. If it exists, stop and report the reason.
2. Start `npm run login:collect` in the background. One attempt per request, never loop.
3. Poll `runtime/collect-login.json` and act on `state`:
   - `opening`, `login`, `submitted`: wait.
   - `needs_2fa`: ask for the 6-digit code the burner account just received, write it to `runtime/collect-2fa.txt`. Three codes maximum.
   - `needs_human`: checkpoint or captcha. Ask the user to finish it in the opened Chrome window.
   - `ok`: session saved to `runtime/collect-ig-state.json`.
   - `closed`: the user closed Chrome; nothing was saved.
   - `error`: quote `message`; a screenshot is at `runtime/collect-login-error.png`.
4. A wrong password writes `runtime/collect-login-blocked.json` and exits. Do not retry or try another password. Ask for the correct one in `.env`, then run once with `--force`. If the user provides a valid session instead, use Session import below.
5. If the user wants to type the password themselves: `npm run login:collect -- --manual`.
6. Check the `pid` in the status file before a new run; never start a second collect login while one is active.

## Verify before handoff

A saved session proves a login happened, not who is logged in. Before another skill uses this session for content hunting, benchmark hunting or bulk reads:

1. `runtime/collect-login.json` must say `state: "ok"`.
2. Read the handle from the live profile at `https://www.instagram.com/`, or let the calling script read it. The storage-state file does not contain the handle.
3. The handle must equal `IG_COLLECT_USERNAME` and must not equal `IG_USERNAME` or `rozetext.ir`.
4. If the page account opens, stop. Do not browse, screenshot, like or follow. Nothing from this session is safe to use.

Report the result as `collector verified: <handle>`. A caller that does not see this line must not start.

The extraction script also enforces this at runtime: it reads the live handle, refuses `rozetext.ir`, and halts with `needs_session` on any mismatch. Do not bypass that check.

## Session import (when password login is blocked)

Use this when Instagram rejects the password, or the user already has a valid session for the collect account.

1. Save the cookie JSON to `runtime/collect-cookies.json`. A Playwright storage state (`{"cookies":[...]}`) and a Cookie-Editor array both work. It must contain `sessionid`; keep `ds_user_id` and `csrftoken` too.
2. Run `npm run session:import`. For another slug: `node scripts/import-session.mjs --account=<slug> --cookies=<path>`.
3. The script refuses `--account=main`, refuses the page Chrome profile, and refuses a cookie file whose `ds_user_id` matches the page session on disk. It loads the cookies into `chrome-profile-collect`, verifies the logged-in account is `IG_COLLECT_USERNAME`, and only then writes `runtime/collect-ig-state.json`, clears the collect block file, and deletes the cookie file.
4. A mismatch means the session belongs to another account. Nothing is saved. Stop and get a session from the collect account. Do not remove the guard or save the cookies by hand.

The cookie file is a live credential. Do not paste it into this skill, `.env`, a commit or chat. The script deletes it after a successful import.

## What stays untouched

| | Page account | Collect account |
|---|---|---|
| env | `IG_USERNAME`, `IG_PASSWORD`, `IG_PROFILE_DIR` | `IG_COLLECT_USERNAME`, `IG_COLLECT_PASSWORD`, `IG_COLLECT_PROFILE_DIR` |
| Chrome profile | `%LOCALAPPDATA%\rozetext\chrome-profile` | `%LOCALAPPDATA%\rozetext\chrome-profile-collect` |
| status | `runtime/login.json` | `runtime/collect-login.json` |
| 2FA file | `runtime/2fa.txt` | `runtime/collect-2fa.txt` |
| saved session | `runtime/ig-state.json` | `runtime/collect-ig-state.json` |
| block file | `runtime/login-blocked.json` | `runtime/collect-login-blocked.json` |
| screenshots | `runtime/login-*.png` | `runtime/collect-*.png` |

- The script refuses to start if the collect profile resolves to the page profile.
- Never delete, move, rename or overwrite `runtime/ig-state.json`, `runtime/login.json` or the page Chrome profile. The collect login does not touch them, and neither should you.
- Never copy cookies between the two profiles. The import path takes a cookie file and refuses the page session; it never reads the page profile.
- One Chrome window per profile. A collect run can run beside a page session, but two runs on one profile corrupt it.

## Separate identity

The collect account must have its own phone number and email. If it shares them with @rozetext.ir, Instagram can link the two accounts, and a ban or challenge on the collector can reach the page account. No script removes that link. Change the contact info in Instagram settings before relying on this account for risky work.

## Safety

- 2FA codes are one-time. A stale code fails and must be requested again.
- Stop after the first block. No repeated login attempts.
- The burner exists to absorb risk. If Instagram challenges it, do not try to recover it with the page account or the page's phone number.
