---
name: rozetext-hunt-benchmark-accounts
description: "Verify and discover Instagram benchmark accounts for the rozetext niche with the collector account. Stores posts, following, followers and the profile picture (base64) in data/benchmark-accounts/benchmark_accounts.json. Load when benchmark accounts need checking or more accounts are needed."
---

# rozetext-hunt-benchmark-accounts

## When to use

For verifying the benchmark account registry or adding new benchmark accounts. The collector account does the browsing; the page account never opens Instagram here.

Not for the page's private insights. That needs `rozetext-login`.

## Page style: @rozetext.ir

The registry exists to benchmark against this page, not any poetry page.

- Niche: modern Persian delneveshteh, text therapy, relationship and self-worth. Not classical poetry and not generic motivation.
- Visual: monochrome paper and ink, black or cream cover, one brush stroke, a circular "رز" stamp, centered Persian typography in 2-3 lines. No faces, stock photos, gradients or busy collages.
- Copy: the on-screen text is the poem, around 250-400 characters in 2-4 short lines, first person or direct address, with a turn at the end. Captions are shorter, usually with one send CTA ("بفرست برای کسی که...") or a save CTA, and 0-3 hashtags.
- Themes: self-worth and acceptance, boundaries, silence and unsaid words, relationship pain and distance, family (mother, sister), leaving with dignity. Hope is a secondary note.
- Performance: share first, save second, comment third. Top reels are lines people send to someone, not news or trends.
- Voice: colloquial Persian, first person "من", direct "تو", generalized "آدم‌ها", short sentences, ellipsis. No formal literary Persian.

Re-derive this from `data/main-database/reels_database.json` if the voice shifts. The last analysis covered 512 reels from 2026-08-14 to 2026-11-11.

## What to hunt

Match:

- Persian, text-first reels with a repeatable typographic template. The cover is type and texture, not a face or stock footage.
- Themes in this lane: self-worth, boundaries, relationship closure, family, silence, distance, leaving with dignity.
- Original writing or a clear author voice. Repost pages only when they add a distinct visual or voice.
- Public and active in the last 30 days. Peer band around the page, roughly 10K-500K followers; larger pages are reference, not peers.
- Share and save driven top reels: lines people send to someone.

Reject:

- Shops, ads, Telegram promos, courses, and "psychology facts" pages.
- Meme, comedy, lifestyle, fashion, food, travel, AI slideshow, and generic motivation.
- Non-Persian, private, inactive, or pages with no original text.
- Covers built from photos of people, stock images, or busy collages; they do not share the visual grammar.

## Preconditions

1. Run `rozetext-data-collect-account-login` first: `npm run login:collect`, then wait for `runtime/collect-login.json` to reach `ok`. Do not start this skill until the collector session is valid.
2. The script refuses unless `IG_COLLECT_USERNAME` is `hosseinheydarpour` and the live session is the same account. On a mismatch, stop and fix the session. Never point it at the page account.
3. One run at a time. Check `pid` in `runtime/benchmark-hunt.json`.

## Data

- File: `data/benchmark-accounts/benchmark_accounts.json`. The folder owns the registry.
- Handles are unique: strip `@`, trim, lowercase before comparing. The script refuses to start if the registry has duplicate handles. Check a handle against `accounts` before adding a manual candidate.
- Each verified account gains:
  - `verified: true`, `verified_at`
  - `posts`, `following`, `followers_count` (numbers)
  - `avatar_base64`, `avatar_mime`
  - `private` when the page is private
- New candidates also carry:
  - `status: "candidate"` and `style_match` (`null` until reviewed)
  - `needs_style_review`, `style_review_image`, `profile_text`
  - `style_notes`, `style_checked_at` after review
- `followers` stays the legacy display string. `followers_count` is the verified number.
- Not found: `verified: false`, `verify_error: "not_found"`. Those are skipped on later runs.
- Writes are atomic and saved after every account.
- Existing verified accounts are grandfathered; the style review applies to pages added from now on.

## Verify pending accounts

```bash
npm run benchmark:hunt -- --limit=10
```

- Default limit 10, maximum 25. Keep it small.
- It opens the collect Chrome profile, checks the account, then visits each unverified profile with human pauses.
- Status: `runtime/benchmark-hunt.json`.
- `ok`: report how many were verified and how many remain.
- `no_work`: every account is verified or marked not found. Ask the user how many new accounts to hunt, then go to Hunt.
- `needs_human`: a challenge or login wall. Stop. Do not retry. Ask the user to resolve it in the collect account, then run again.
- `error`: quote `message`. A screenshot is at `runtime/benchmark-hunt-error.png`.

A 404 is a result, not a retry. Do not remove accounts on your own; report them.

### Style review

A page is not a benchmark peer just because it exists.

- New candidates get `needs_style_review: true`, a screenshot at `runtime/benchmark-review-<handle>.png`, and `profile_text`.
- Read the screenshot and `profile_text` against `Page style` and `What to hunt`.
- Match: set `style_match: true`, `style_notes`, `style_checked_at`, `needs_style_review: false`, and `status: "verified_live"` (or `verified_private` if the page is private).
- No match: set `style_match: false`, `style_notes`, `style_checked_at`, `needs_style_review: false`, and `status: "style_rejected"`. Report it. Do not delete it.
- Only `style_match: true` accounts count toward the benchmark set.

## Hunt new accounts

Only when no unverified accounts remain. The script refuses to hunt otherwise.

Ask the user how many accounts to hunt, then run:

```bash
npm run benchmark:hunt -- --hunt=5
```

To start from the closest visual peers instead of random seeds, pass up to six handles:

```bash
npm run benchmark:hunt -- --hunt=5 --seed=@halekhoub,@text.love400,@heliumm.__,@leyli_geraphy,@atiya_text,@_khaazaan_
```

- It opens verified peer profiles, uses the suggested-accounts button, and checks each candidate. Rejected candidates are never used as seeds.
- Public profiles only. Existing handles, the page account and the collector are skipped.
- It stops at the requested number. If fewer are found, it reports the shortfall and does not loop.
- New accounts get `source: "suggested:@<seed>"`, `discovered_at`, and the same verified fields. `cluster` stays empty; do not invent one.

`--hunt` automates only the suggested-accounts route. It adds up to N candidates, not N confirmed peers. Each gets `needs_style_review: true` and a screenshot. Review them with the Style review section; if fewer than N match, run again for the shortfall.

Handles found through the routes below are manual candidates: check the handle is not already in `accounts`, then append it with `handle`, `profile_url`, `status: "candidate"`, `source`, and no `verified` field. Run the verify mode with `--limit=N`. The script fills the stats and leaves the candidate in the style review queue.

## Discovery routes

Use the quiet routes first. Do not like, follow or comment to make a page appear.

1. Suggested accounts: open a verified peer, click the similar-accounts button, collect handles. This is what `--hunt` automates.
2. Hashtags: the page's own tags and adjacent tags, such as #دلنوشته, #متن_احساسی, #تکست_عاشقانه, #حرف_دل, #آدم_امن, #سکوت, #آرامش, #مرز and #رزتکست. Check both top and recent.
3. Audio: open the audio page of a top peer reel and collect the accounts using the same track. Shared audio is a strong style signal.
4. Credits and mentions: captions that credit a writer or tag a collaborator; the tagged account is often a peer.
5. Comment sections: active commenters under top peer reels. Small creators comment on bigger pages.
6. Following lists: the public following list of a verified peer. Creators follow the pages they benchmark.
7. Search: search the page's signature lines and niche phrases ("آدم امن", "من برای همه بودم", "حالا که همه چی تموم شده") and open the accounts and reels tabs.
8. Cross-platform: bio links to Telegram, Pinterest or TikTok; the same text and typography often appears under another handle.
9. BeatAPI: hashtag and profile search for a candidate list without touching the account, then verify the shortlist with the collector.
10. Explore and reels feed: last resort. It pollutes the collector's recommendations; never like or follow to train it.

After a route gives a handle, normalize it and check it against `accounts`. If it is already there, skip it; the script also refuses a registry with duplicate handles. Then add it as a candidate, verify it, and run the style review before it joins the benchmark set. Do not add a page from its cover alone.

## Human behaviour

- One profile at a time, one Chrome window. No parallel tabs.
- Random 6-13s between profiles, longer every 5.
- No likes, follows, comments, DMs or posts. Browsing only.
- No Instagram API calls; the script browses the page and fetches only the avatar image.
- Stop on the first challenge. A blocked collector is cheaper than a blocked page.

## Status file

| field | meaning |
|---|---|
| `state` | `checking_session`, `verifying`, `hunting`, `ok`, `no_work`, `needs_human`, `error` |
| `current` | handle being checked |
| `done`, `failed` | verified and failed counts |
| `remaining` | unverified accounts left |
| `added`, `target` | hunt progress |
| `pid` | active process |

## Safety

- The collector session is the only session this skill may use.
- Never open the page Chrome profile, `runtime/ig-state.json` or the page account.
- If the script reports `IG_COLLECT_USERNAME must be hosseinheydarpour`, stop. Do not edit `.env` to bypass it.
- The registry is data, not a cache: do not delete accounts or overwrite avatars by hand.
