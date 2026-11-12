---
name: rozetext-login
description: "Authenticated Instagram session for @rozetext.ir. Opens Chrome, logs in, handles the 2FA code, and keeps the session for private data work. Load only when the task needs the account."
---

# rozetext-login

## When to use

Only for work that needs an authenticated session: insights, saves, reach, DMs, comments, audience data. Public profile and post metrics come from BeatAPI; do not open a browser for those.

## Credentials

- `IG_USERNAME` (already `rozetext.ir`) and `IG_PASSWORD` live in `.env`, which is gitignored.
- Never print the password, never echo it back, never commit it, never place it in a skill file.
- If the user pastes a password in chat, write it to `.env` and suggest rotating it afterwards, since chat history keeps it.

## Run

0. Before running, check `runtime/login-blocked.json`. If it exists, do not run. Report the reason to the user and wait for a corrected password.
1. Start `npm run login` in the background. One attempt per user request, never loop.
2. Poll `runtime/login.json` every few seconds and act on `state`:
   - `opening` — Chrome is up; wait.
   - `submitted` — credentials or a code were sent; wait.
   - `needs_2fa` — ask the user for the 6-digit code they just received, write it to `runtime/2fa.txt`, the script submits it and deletes the file. Never invent or reuse a code. Three codes maximum, then it stops.
   - `needs_human` — a checkpoint or captcha. Ask the user to finish it in the opened Chrome window; the script keeps waiting.
   - `ok` — session saved and Chrome closed.
   - `closed` — the user closed Chrome; nothing was saved.
   - `error` — quote `message` to the user; a screenshot is at `runtime/login-error.png`. Wrong password and expired codes need a new run.
3. A wrong password writes `runtime/login-blocked.json` and exits. Do not rerun, do not try another password, do not offer workarounds. Tell the user the password was rejected and ask for the correct one, written into `.env`. Only after they confirm, run once with `--force`.
4. When the user is unsure of the password, run `npm run login -- --manual` instead: it opens Chrome without touching the form and waits for them to type it. The block file does not apply to manual mode.
4. The script exits by itself. Do not open a second run while one is active; check the `pid` field first.

## Session

- Chrome profile: `%LOCALAPPDATA%\rozetext\chrome-profile` on Windows, override with `IG_PROFILE_DIR`.
- Cookies are also written to `runtime/ig-state.json` for later scripts.
- A valid session skips the form and exits `ok`.
- Session expiry, password change or a new device challenge: rerun and handle the new state.

## Safety

- 2FA codes are one-time. A stale code fails and must be requested again.
- The script only logs in. It never posts, follows, changes settings or reads the password back into output.
- One Chrome window at a time; two runs on the same profile corrupt the session.
