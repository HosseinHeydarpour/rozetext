# Database contract

Four places hold the hunt. They do different jobs.

| file | job |
|---|---|
| `data/main-database/reels_database.json`, `accounts.Default` | the page's reels, plus confirmed hunted texts |
| same file, `accounts.hunt` | staging for extraction only |
| `data/content-hunt/candidates.json` | score, provenance and pipeline status |
| `data/hunted-candidates/<date>/candidates.json` | the dashboard's daily snapshot |

The source shortcode is the key in all three, so a text can be traced from the queue to the database.

## `accounts.Default`

The page's own 512 reels live here and are never modified by the hunt.

A hunted text enters this account only after scoring above 65. It gets the page's normal item shape, with only `caption` and `content` filled:

```json
"DfW7ev_zMTY": {
  "url": "",
  "date": "",
  "caption": "rewritten caption with #رزتکست",
  "content": "exact on-screen text",
  "prediction": "",
  "is_flopped": false,
  "is_new": false,
  "is_updated": false,
  "last_stats": null
}
```

Every other field is empty. No source numbers, no source URL, no score.

| field | filled when | meaning |
|---|---|---|
| `caption` | confirmation | rewritten publish-ready caption, ending with `#رزتکست` |
| `content` | confirmation | exact on-screen text of the source |
| `url` | after publishing | the page's own reel URL |
| `date` | after publishing | the page's publish date |
| `last_stats` | after measuring | `{views, followers, share, save}` from the page's own export |
| `prediction`, `is_flopped`, `is_new`, `is_updated` | never by the hunt | leave the defaults |

Rules:

- The item key is the **source** shortcode. It does not change after publishing.
- The final caption is rewritten in the page's voice and ends with `#رزتکست`. The source caption stays in the daily file as `source_caption`. Never add the tag to `content`.
- Until the page publishes, `url` is empty and `last_stats` is null. The dashboard will show the item with 0 views and a FLOP tier; that is expected and correct, it has no result yet.
- After publishing, fill `url`, `date` and later `last_stats`. Do not put the source account's metrics here.
- Writes are atomic: write `.tmp`, then rename. UTF-8, no BOM.

## `accounts.hunt` (staging)

Only exists between discovery and scoring. Each item carries what extraction needs:

```json
"DfW7ev_zMTY": {
  "url": "https://www.instagram.com/reel/DfW7ev_zMTY/",
  "caption": "exact caption",
  "content": "",
  "source_account_id": "17841400000000000",
  "source_handle": "shadighorbanyy",
  "benchmark_account_id": "@shadighorbanyy",
  "method": "benchmark",
  "found_at": "2026-11-13T02:26:31.749Z"
}
```

- `source_account_id` is the numeric id when the API returns it, otherwise the handle.
- `benchmark_account_id` is the numeric id when the source is a benchmark account, otherwise its registry handle.
- `content` is filled by `update-reels-content.mjs --apply`.
- After scoring, a confirmed item is copied to `Default` and deleted here. A rejected item is deleted here and kept in the queue as a row.
- The account is empty after a clean run. If it is not empty, the run did not finish; resume from scoring, not from discovery.

## `data/content-hunt/candidates.json`

The ranked queue holds what the database no longer holds: score, lift, provenance and status.

```json
{
  "meta": { "updated_at": "2026-11-13T…", "count": 1 },
  "items": {
    "DfW7ev_zMTY": {
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
      "status": "confirmed",
      "confirmed": true,
      "confirmed_at": "2026-11-13T…",
      "source_handle": "shadighorbanyy",
      "source_url": "https://www.instagram.com/reel/DfW7ev_zMTY/",
      "method": "benchmark",
      "found_at": "2026-11-13T…",
      "published_url": "",
      "measured_views": null
    }
  }
}
```

| status | meaning |
|---|---|
| `confirmed` | all ten gates pass, the text is in `accounts.Default` |
| `rejected` | score 65 or below, no text in the database |
| `published` | the page posted it; `published_url` is set |
| `measured` | 7 or 30 day numbers are in |

`lift` is the source post's views divided by the source account's median. A missing median is a rejection; fetch it before scoring.

## `data/hunted-candidates/<YYYY-MM-DD>/candidates.json`

The dashboard's daily snapshot. Written after scoring, only for confirmed candidates (all ten gates). Date is the run date in Asia/Tehran.

```json
{
  "date": "2026-11-13",
  "run_at": "2026-11-13T10:20:00.000Z",
  "collector": "hosseinheydarpour",
  "count": 3,
  "published": 0,
  "cost_usd": 1.38,
  "candidates": [
    {
      "shortcode": "DfW7ev_zMTY",
      "rank": 1,
      "score": 79,
      "band": "A",
      "fit": 45,
      "proof": 25,
      "lift": 3.4,
      "lines": 16,
      "hook": "letter",
      "theme": "دوری/جدایی",
      "reasons": ["۱۶ خط", "شروع نامه‌وار", "لیفت ۳.۴ برابر اکانت منبع"],
      "source_handle": "shadighorbanyy",
      "source_account_id": "17841400000000000",
      "source_name": "شادی قربانی",
      "source_url": "https://www.instagram.com/reel/DfW7ev_zMTY/",
      "source_posted_at": "2026-10-31T06:59:00",
      "source_views": 1100000,
      "source_likes": null,
      "source_comments": null,
      "source_median": 320000,
      "method": "benchmark",
      "benchmark_account_id": "@shadighorbanyy",
      "source_caption": "کپشن دقیق پیج مادر",
      "caption": "کپشن بازنویسی‌شده با #رزتکست",
      "caption_origin": "rewritten",
      "content": "متن دقیق روی ریل",
      "duration_sec": 8,
      "visual_note": "پس‌زمینه مشکی، متن سفید وسط‌چین",
      "cover_url": "",
      "confirmed": true,
      "confirmed_at": "2026-11-13T10:20:00.000Z",
      "published": false,
      "published_url": "",
      "published_at": "",
      "status": "confirmed",
      "found_at": "2026-11-13T10:12:00.000Z"
    }
  ]
}
```

Field notes:

| field | why it is there |
|---|---|
| `rank`, `score`, `band`, `fit`, `proof`, `lift`, `reasons` | why this text was picked |
| `source_handle`, `source_account_id`, `source_name`, `source_url` | the mother page, for credit and traceability |
| `source_posted_at`, `source_views`, `source_likes`, `source_comments`, `source_median` | how the source performed; `null` when the API did not return it |
| `method`, `benchmark_account_id` | how it was found and which benchmark account it belongs to |
| `source_caption`, `caption`, `caption_origin` | the exact source caption, the rewritten publish-ready caption, and whether it was rewritten or generated |
| `content` | the exact on-screen text |
| `lines`, `hook`, `theme` | the text shape that drives the score |
| `duration_sec`, `visual_note`, `cover_url` | production hints; empty when unknown |
| `confirmed`, `confirmed_at` | the candidate passed the 65 bar and the text is complete |
| `published`, `published_url`, `published_at` | the publish flag and its evidence |
| `status`, `found_at` | pipeline state and timestamp |

Rules:

- Only confirmed candidates. Rejected ones stay in the queue, not here.
- One folder per day. A second run merges by `shortcode`, re-ranks, and updates `count`.
- Every candidate carries the full key set above. Unknown numbers and dates are `null`, unknown strings `""`, unknown booleans `false`. A missing key is a bug.
- `confirmed` is `true` only when all ten gates in `references/scoring.md` pass. `confirmed_at` is the confirmation time.
- `caption` is the rewritten, publish-ready caption and ends with `#رزتکست`. `source_caption` is the original and may be empty.
- `published` is a boolean and starts `false`. It turns `true` only when the page's own reel URL exists.
- `source_likes` and `source_comments` stay `null` when the API does not return them. Do not write 0 as a stand-in.
- Writes are atomic. UTF-8, no BOM.

The dashboard reads it through `GET /api/hunted` (latest day) or `GET /api/hunted?date=YYYY-MM-DD`.

## `data/content-hunt/backlog.json`

Near misses for dry days. Never production.

An item enters the backlog only when it has 5-7 lines, a lift of at least 4x, and a score of at least 75. It keeps the same fields as a daily candidate plus:

```json
{
  "tier": "B",
  "confirmed": false,
  "reason": "5-7 lines, high lift"
}
```

Rules:

- Backlog items never enter `accounts.Default` and never appear in the daily dashboard file.
- The page may use one manually, knowing the prior is about 10%, not 40-50%.
- A backlog item is deleted when the text is older than 60 days or the page publishes it.
- 1-4 line texts never enter the backlog.

## Run log

`data/content-hunt/runs/<YYYY-MM-DD>.json` holds the raw discovery pages and the cost:

```json
{
  "date": "2026-11-13",
  "collector": "hosseinheydarpour",
  "methods": { "benchmark": 18, "hashtag": 5, "explore": 2 },
  "pages_per_account": 3,
  "calls": 62,
  "cost_usd": 1.384,
  "discovered": 2700,
  "kept": 40,
  "extracted": 20,
  "scored": 20,
  "confirmed": 3,
  "errors": []
}
```

No metric enters the database or the queue without `fetched_at` in the run log or `found_at` in the item.
