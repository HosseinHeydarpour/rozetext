---
name: rozetext-content-hunt
description: "Hunt Persian text reels from 15-20 rotating benchmark accounts, hashtags and explore, copy the exact on-screen text, score it against the page's 512-reel history, and keep only scores above 65 in the main reels database. Load when the user asks to hunt content, find viral texts, refill the pipeline, or check what is working in the niche."
---

# rozetext-content-hunt

## What it does

Finds reels in the page's niche that already beat their own account, copies the exact on-screen text and caption, scores the text against the page's own history, and keeps only the high-probability ones.

A selected text goes into `accounts.Default.items` in `data/main-database/reels_database.json`, next to the page's own reels, with only `caption` and `content` filled. Every other field stays empty until the page publishes it.

The same day's selected texts are also written to `data/hunted-candidates/<YYYY-MM-DD>/candidates.json`, a dated file the dashboard reads through `GET /api/hunted`.

The text is never rewritten. The user wants the exact text that worked. Source provenance lives in the queue, so credit stays possible.

It never posts, schedules, likes, follows, comments or sends a DM.

## Hard preconditions

Do not start a run until all four are true.

1. `rozetext-data-collect-account-login` ran and reported `ok`.
2. The handle check passed: `collector verified: <handle>`, the handle is `IG_COLLECT_USERNAME`, and it is not `IG_USERNAME` or `rozetext.ir`. If this line is missing, go back and verify; do not browse.
3. `BEATAPI_API_KEY` is in `.env`. Read it from env, never print it.
4. No other content-hunt or reel-content run is active. Check the `pid` in `runtime/reel-content-update.json`.

If the live session is the page account, stop. The collector absorbs the risk; the page never browses here.

## Sources and methods

Every candidate carries exactly one `method`:

| method | where it came from | BeatAPI reference | price |
|---|---|---|---|
| `benchmark` | a verified account in `data/benchmark-accounts/benchmark_accounts.json` | `data:instagram.v3.get_user_reels` | $0.024 per page |
| `hashtag` | a hashtag page | `data:instagram.fetch_hashtag_posts` | $0.003 |
| `explore` | an explore section | `data:instagram.fetch_explore_sections` then `data:instagram.fetch_section_posts` | $0.003 |
| `recommended` | the reels feed | `data:instagram.v3.get_recommended_reels` | $0.024 |
| `search` | a keyword search | `data:instagram.v2.search_reels` | $0.006 |

Details for one post, when the list response lacks the owner or the caption: `data:instagram.fetch_post_by_url`, $0.003.

Use the `beatapi` skill for the exact call shape. Search, inspect, run. Never guess a reference.

Hashtag and explore are catalogued as `partial`. Run one call of each before a full sweep and read what actually comes back. If the shape is unusable, fall back to benchmark accounts only and log it. Do not invent fields.

`recommended` is off by default. It is generic and it pollutes the collector's feed.

## Prefilter (free, before any screenshot)

Keep a candidate only when all are true:

- Persian text in the caption
- `views >= 1.5 ×` the source account's median. For benchmark accounts the median is computed from the pages you fetched. For hashtag, explore and search finds, fetch the author's last 12 reels only for the top 10, otherwise leave `proof` empty and cap the score at 70.
- caption length 80-800 characters
- not already in `accounts.Default.items` or `accounts.hunt.items`
- text similarity below 0.6 against the page's 512 reels and against the other candidates

Publish date is not a filter. An old post that beat its own account is still a valid source.

Similarity: normalize (drop spaces, punctuation and Arabic/Persian diacritics), take character 3-grams, compute Jaccard. Above 0.6 is a near-duplicate.

This stage is metadata only. No browser, no screenshots.

## Run

### 0. Gate

Run `rozetext-data-collect-account-login`, confirm `collector verified: <handle>`, then continue. Write the handle into the run log.

### 1. Discover

- Benchmark: take the next **18** verified accounts from the registry (15-20 is the band), starting at `account_cursor` in `data/content-hunt/state.json`. For each, fetch **3 pages of 50 reels** with `first=50`, following `after`/`end_cursor`. That is roughly the depth of 10-15 grid scrolls. If pagination fails, fall back to 10-15 browser scrolls on the collect profile and collect the same fields from the grid.
- Hashtags: `دلنوشته`, `متن_عاشقانه`, `تکست`, `دلتنگی`, `حرف_دل`. One page each. Never hunt with `رزتکست` or `روزتکست`: `#رزتکست` is the page's own tag and is added only to the final caption.
- Explore: two sections that look like text, poetry or quotes. Skip if none match.
- Sleep 2-4 seconds between calls. Cap the run at 100 calls. Stop on 429 or 402.

Write the raw pages to `data/content-hunt/runs/<date>.json`, with `method`, `source`, `url`, `views`, `caption`, `owner_id`, `owner_handle`, `posted_at`, `fetched_at`, `source_median` and the cost. `source_median` is the median of the reels fetched from that benchmark page; `lift` divides by it.

After the run, advance `account_cursor` by the number of benchmark accounts used, wrapping at the end of the verified list, and write `last_discovery`.

### 2. Stage

Extraction needs a URL, so candidates go to the staging account first, never to `Default`.

Add the prefiltered candidates to `accounts.hunt.items`, keyed by shortcode:

```json
{
  "url": "https://www.instagram.com/reel/<shortcode>/",
  "caption": "exact caption",
  "content": "",
  "source_account_id": "",
  "source_handle": "",
  "benchmark_account_id": "",
  "method": "benchmark",
  "found_at": "2026-11-13T02:26:31.749Z"
}
```

`source_account_id` is the numeric id of the page that posted the reel when the API returns it, otherwise the handle. `benchmark_account_id` is that page's numeric id when it is a benchmark account, otherwise its registry handle. Never invent an id.

Write atomically: `data/main-database/reels_database.json.tmp`, then rename. Keep `active_account` on `Default`.

### 3. Extract

```bash
npm run reels:content -- --account=hunt --limit=20
```

The script opens the collect profile, reads the live handle, refuses `rozetext.ir`, and saves 3-5 frames per reel to `runtime/reel-shots/` with a manifest.

Read the screenshots and write `runtime/reel-content/transcripts.json`, keyed by shortcode, with the exact on-screen text:

- preserve line breaks and spelling
- no cleanup, no summarization, no rewriting
- if the reel has no text, leave it out of the transcripts

Then:

```bash
npm run reels:content -- --account=hunt --apply
```

The script fills `content` and removes the screenshots. An item with no transcript keeps an empty `content`; remove it from `accounts.hunt.items` and log the shortcode as `no_text`.

### 4. Score and select

Score every staged item that has `content` with `references/scoring.md`. Selection is strict: only `score > 65` reaches the main database.

For a selected item:

1. Copy it into `accounts.Default.items`, keyed by the same shortcode, with the page's normal item shape and every field empty except `caption` and `content`:

```json
{
  "url": "",
  "date": "",
  "caption": "exact caption",
  "content": "exact on-screen text",
  "prediction": "",
  "is_flopped": false,
  "is_new": false,
  "is_updated": false,
  "last_stats": null
}
```

2. Delete the staging item from `accounts.hunt.items`.
3. Update `accounts.Default.last_updated`.

Caption rule: the final `caption` in `accounts.Default` ends with ` #رزتکست`. Remove any `#رزتکست` already in the source caption first, so the tag appears exactly once. Keep the rest of the caption as written and keep the on-screen `content` untouched.

For anything at 65 or below: delete the staging item and write a `rejected` row to the queue. No text enters `Default`.

Write the queue to `data/content-hunt/candidates.json`:

```json
{
  "shortcode": "DfW7ev_zMTY",
  "score": 79,
  "band": "A",
  "fit": 45,
  "proof": 25,
  "lift": 3.4,
  "lines": 16,
  "hook": "letter",
  "theme": "دوری/جدایی",
  "reasons": ["۱۶ خط", "شروع نامه‌وار", "لیفت ۳.۴ برابر اکانت منبع"],
  "status": "selected",
  "confirmed": true,
  "confirmed_at": "2026-11-13T02:26:31.749Z",
  "source_handle": "shadighorbanyy",
  "source_url": "https://www.instagram.com/reel/DfW7ev_zMTY/",
  "method": "benchmark",
  "found_at": "2026-11-13T02:26:31.749Z"
}
```

Statuses: `selected` (in `Default`), `rejected` (not selected, kept for audit), `published`, `measured`.

### 4b. Dashboard file

Write the selected candidates to `data/hunted-candidates/<YYYY-MM-DD>/candidates.json`. The date is the run date in Asia/Tehran, not UTC.

- One folder per day. If the folder already exists, merge by `shortcode` and re-rank; never overwrite another run's candidates.
- Only selected items, `score > 65`.
- Every candidate carries the full key set from `references/database.md`. Unknown values are `null` or empty, never a missing key.
- `confirmed: true` and `confirmed_at` only when `score > 65` and `caption`, `content` and `final_caption` are non-empty.
- `published` starts `false` for every candidate.
- Sort by score and set `rank` from 1.
- Write atomically. The dashboard reads this file through `GET /api/hunted` (latest day, or `?date=YYYY-MM-DD`).

The full row shape is in `references/database.md`. The short version: source identity, source caption, on-screen text, final caption, score and reasons, and the publish flag.

### 5. Report

Give the user a Persian report with:

- how many reels were discovered, staged, extracted and scored
- how many passed 65 and went into the main database
- the selected texts: link, score, band, why it scored, source handle
- the daily file path
- the cost of the run
- the one thing that blocked the run, if anything

Do not present a rejected item as a candidate.

## Database contract

Full field table and fill schedule: `references/database.md`.

Short version:

- `accounts.Default` is the page's reels. It gains selected hunted texts with only `caption` and `content`; every other field is empty. The page's 512 reels are never touched.
- `accounts.hunt` is staging only. It exists for extraction and is emptied after scoring. It is not a library.
- `data/content-hunt/candidates.json` is derived: it holds the score, provenance and pipeline status. It is not a second copy of the text.
- The source shortcode is the key in both the database and the queue, so a published text can be traced back to its source.

## Scoring

The model and its evidence: `references/scoring.md`.

| band | score | expected viral rate | action |
|---|---:|---|---|
| A | 66-100 | 40-50% | selected, goes to `Default` |
| B | 45-65 | 20-30% | rejected, kept for audit |
| C | 0-44 | under 10% | rejected |

The bar is 65 because the page publishes many texts. A candidate that is merely average is not worth a slot.

These are priors from the page's own history, not calibrated probabilities. Say so in the report.

The model is a heuristic until the feedback loop has 20 measured posts. Recalibrate then.

## Feedback loop

1. When the user publishes a selected text, find its `Default` item by source shortcode. Fill `url` with the page's reel URL, `date` with the publish date, set `status: "published"` in the queue, and set `published: true`, `published_url` and `published_at` in the daily file that holds that shortcode. Update the daily file's `published` count.
2. 7 and 30 days later, pull the page's reel metrics (`npm run sync`, or the Meta export), match the published shortcode, and fill `last_stats` (`views`, `followers`, `share`, `save`) in the database item and `status: "measured"` plus the real numbers in the queue.
3. Never fill a missing metric with a guess. Missing stays missing.
4. Monthly, compare the viral rate of A, B and C. If A does not beat B, the weights or the 65 bar are wrong; adjust `data/content-hunt/model.json` and log the change.
5. After 20 measured posts, refit the weights on real outcomes instead of the original 512.

## Guardrails

- Collector account only. Never open the page Chrome profile, `runtime/ig-state.json` or `instagram.com` as `rozetext.ir`.
- Read-only on Instagram. No likes, follows, comments, DMs, saves or posts.
- One profile at a time, one Chrome window, 6-13 seconds between reels, 20 reels per batch.
- Stop on the first challenge or checkpoint. A blocked collector is cheaper than a blocked page.
- BeatAPI: one call every 2-4 seconds, 100 calls per run, stop on 429/402.
- No secrets in data files, logs or chat.
- The exact text is copied for production. The source handle stays in the queue so the page can credit the writer.

## Cost

A default run: 18 accounts × 3 pages ($1.30), 5 hashtags ($0.015), 2 explore sections ($0.006), up to 20 post details ($0.06). About $1.38. Extraction is free but takes 10-15 minutes of browser and reading time.

Run at most once a day. The niche does not produce 20 proven texts every few hours.
