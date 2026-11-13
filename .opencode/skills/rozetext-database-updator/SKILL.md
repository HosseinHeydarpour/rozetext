---
name: rozetext-database-updator
description: "Fill the empty `content` field of the reels database from the reel video itself. Uses the collector account (never @rozetext.ir), screenshots each reel, the agent transcribes the on-screen Persian text, and the screenshots are deleted after the merge. Load when reels_database.json has reels without content."
---

# rozetext-database-updator

The reels database stores the on-screen text of every reel in `content`. Some reels were added without it. This skill opens those reels with the burner account, captures the frames, transcribes the text, and writes it back.

## When to use

- `content` is empty for one or more reels in the database.
- After the analyzer imports new reels that arrived without manual text.
- Not for captions, stats, insights or `last_stats`. This skill only fills `content`.

## Database

Resolution order, first existing file wins:

1. `data/main-database/reels_database.json`
2. `data/reels_database.json`

Shape: `active_account` plus `accounts[name].items[reelCode]`. Write the file the script reports; never create a second store.

## Hard rule: the page account never opens a reel here

- The script refuses if `IG_COLLECT_USERNAME` is missing, equals `rozetext.ir`, or if the collect profile resolves to the page Chrome profile.
- It then checks the live session username on Instagram. If that username is `rozetext.ir` it stops with `error`; if it is not the collector it stops with `needs_session`, and screenshots the state.
- Do not bypass either check, do not edit `.env` to make it pass, and never run this skill with `npm run login` or `runtime/ig-state.json`.
- If the collector is unavailable, stop. Reading reels with the page account risks the page.

## Preconditions

1. Load `rozetext-data-collect-account-login`.
2. Run `npm run login:collect` once and wait for `runtime/collect-login.json` to reach `ok`.
3. Check `runtime/collect-login-blocked.json` first. If it exists, stop and report it.
4. One Chrome window at a time. Do not start a collect login while a collect run is active, or vice versa.

## Step 1: collect screenshots

```bash
npm run reels:content -- --limit=8
```

- Default 8 reels, maximum 25. Keep a batch at 8.
- Run this in the foreground. A background shell job can be killed after a few minutes and takes Chrome with it; the run then reports `closed`.
- Reels are picked in random order from the ones with an empty `content`.
- Status: `runtime/reel-content-update.json`.
- The script pauses 18-42s between reels and 90-180s every 5. Do not edit those pauses.
- On `ok`, screenshots are in `runtime/reel-shots/`, one or two frames per reel, listed in `runtime/reel-shots/manifest.json`.

Act on `state`:

| state | action |
|---|---|
| `checking_session` | wait |
| `collecting` | wait; do not open a second browser |
| `ok` | go to Step 2 |
| `needs_session` | run the collector login, then repeat Step 1 once |
| `needs_human` | stop. The collector hit a challenge. Do not retry today. |
| `closed` | the user closed Chrome; report and stop |
| `no_work` | every reel already has content |
| `error` | quote `message`; screenshot at `runtime/reel-content-error.png` |

If `runtime/reel-shots/manifest.json` already lists shots from an unfinished run, transcribe and apply those first. The next batch skips codes already in the manifest, so an interrupted run never loses its captures.

If a reel is deleted or 404, it counts as failed and is skipped. Do not remove it from the database.

## Step 2: transcribe

Read `runtime/reel-shots/manifest.json`, then read each `shots` image with the read tool. Write the text to `runtime/reel-content/transcripts.json`:

```json
{
  "DcB517Qqp0z": "خط اول\nخط دوم\nخط سوم",
  "DcDEU3eKOWW": "خط اول\nخط دوم"
}
```

Transcription rules:

- Only the text visible inside the video frame.
- Preserve line breaks line by line. Two frames: append frame 2 after frame 1, do not repeat lines that are already there.
- Standard Persian characters. Convert Arabic `ي` and `ك` to `ی` and `ک`.
- Keep the author's wording, punctuation and ellipsis. Never paraphrase, complete a cut line, fix grammar or translate.
- Drop the @rozetext.ir watermark, usernames, buttons, view counts and any other UI.
- Hashtags, CTA lines and emoji only when they are part of the video text. The caption is not a source.
- A frame that is blurred, mid-animation or cut means the reel is not ready. Leave that code out of the JSON; it retries next run.

A batch of 8 reels is 8-16 images. Stop and apply after the batch. Do not transcribe 30 reels in one reply.

## Step 3: apply and clean up

```bash
npm run reels:content -- --apply
```

- Merges only codes that exist in the database and still have an empty `content`.
- Never overwrites a non-empty `content`, `caption`, `date`, `url`, `last_stats` or the flags.
- Saves atomically: `*.tmp`, then rename, and bumps `accounts[active].last_updated`.
- On success it deletes `runtime/reel-shots/` and `runtime/reel-content/transcripts.json`.
- If nothing was applied, the screenshots stay for inspection. `npm run reels:content -- --cleanup` removes both by hand.

Report: reels filled, reels skipped, how many still have no content.

## Human behaviour

- Collector profile only, one Chrome window, one tab.
- No likes, saves, follows, comments, DMs or shares. Watching only.
- No direct parallel tab opening and no repeated reload of the same reel.
- Two batches per day maximum, ideally one. A 100-reel backfill takes days, not an hour.
- Stop at the first challenge or rate-limit message. A blocked burner is cheap; a blocked page is not.
- If Instagram asks for a login or checkpoint, stop. Do not retry, do not switch accounts, do not use the page's phone or email.

## Status file

| field | meaning |
|---|---|
| `state` | `checking_session`, `collecting`, `ok`, `needs_session`, `needs_human`, `closed`, `no_work`, `error` |
| `current` | reel code being captured |
| `index`, `total` | progress in this batch |
| `saved`, `failed` | reels captured and reels skipped |
| `pending` | shots from an earlier run waiting to be transcribed |
| `remaining` | reels still without content |
| `manifest` | path to the screenshot manifest |
| `applied`, `skipped` | result of `--apply` |
| `pid` | active process |

## Failure table

| output | meaning |
|---|---|
| `IG_COLLECT_USERNAME is missing` | set it in `.env`; never borrow `IG_USERNAME` |
| `points at the page account` | the collector username is wrong; fix `.env` |
| `resolves to the page profile` | `IG_COLLECT_PROFILE_DIR` is the page profile; fix it |
| `refusing to run: the live session is the page account` | the page session is open; stop and redo the collector login |
| `live session is X, expected Y` | the session belongs to another account; stop |
| `two navigations failed in a row` | stop; report and retry another day |
| `two reels in a row produced no screenshot` | stop; the layout changed or the page is blocked |

## What stays untouched

- Page profile, `runtime/ig-state.json`, `runtime/login.json`, `runtime/2fa.txt`.
- `caption`, `last_stats`, `prediction`, `is_flopped`, `is_new`, `is_updated`.
- Other accounts in the database, `active_account`, and every reel that already has content.
