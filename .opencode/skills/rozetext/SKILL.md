---
name: rozetext
description: "Core skill for the rozetext.ir Instagram page: identity, data rules, and routing to its sub-skills. Load when working on rozetext content, the site, the dashboard, or account access."
---

# rozetext

Page: @rozetext.ir — Persian poetry (دلنوشته) and typography.
Domain: rozetext.ir
Repo: HosseinHeydarpour/rozetext (private)

## Sub-skills

- `rozetext-login` — authenticated Instagram session. Load before any task that needs private account data (insights, inbox, comments).
- `rozetext-data-collect-account-login` — separate session for the data-collection burner account. Load when a task could risk the page account. Never replaces the page session.
- `rozetext-hunt-benchmark-accounts` — verify and discover benchmark accounts with the collector account. Stores profile stats and avatars in `data/benchmark-accounts/`.
- `rozetext-direct-admin`: cautious inbox replies. Scans threads read-only, drafts warm Persian replies, and sends only after explicit approval.

## Where things live

- Repo rules: `AGENTS.md`
- Architecture: `docs/ARCHITECTURE.md`
- Visual direction: `DESIGN.md`, once written
- Data: `data/*.json`

## Rules

- No invented, estimated, rounded-up or undated metric. Every public number comes from `data/` and carries its date.
- Never post, comment, DM, follow or unfollow without explicit approval in the current conversation.
- Credentials live in `.env` only. Never write a password into a skill, a data file, a dashboard file or a commit.
- The public site shows only fields whitelisted by `scripts/build-site.mjs`, never the raw data files.
- Site and dashboard are Persian RTL with self-hosted fonts. No CDN.
- When a task touches UI or copy, follow antislop.

## Account access

Private data needs `rozetext-login`. Public profile and post metrics come from BeatAPI and do not need a browser.

## Open work

`DESIGN.md` and the voice references are written after the first real data sync, from the page itself, not guessed.
