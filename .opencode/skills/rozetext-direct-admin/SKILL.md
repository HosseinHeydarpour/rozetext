---
name: rozetext-direct-admin
description: "Cautious, human-paced management of @rozetext.ir Instagram DMs. Scans threads read-only, drafts warm conversational Persian replies, and sends only after explicit approval. Load for inbox work."
---

# rozetext-direct-admin

## When to use

The page's Instagram inbox: unanswered DMs, welcomes, thank-yous, poem reactions, community care.

Not for cold outreach, mass DMs, sales, collabs, or any account other than @rozetext.ir.

## Order of work

1. Load and run `rozetext-login`. Do not open the inbox until it reports `ok` or the saved session is valid.
2. Run the read-only scan.
3. Read the threads and screenshots. Draft replies.
4. Show the exact text and recipient. Wait for explicit approval.
5. Send with a small limit.
6. Report sent, skipped, escalated.

A draft is not approval. A "looks good" from an earlier session is not approval. Approval is per batch, after the user sees the exact text.

## Non-negotiables

- Read-only by default. `--scan` never sends.
- One account: `rozetext.ir`. The script checks the `sessionid` cookie, the live handle, and whether the profile shows own-account controls. Any other handle, logged-out page, or challenge stops the run.
- Never type credentials in this workflow. If the session is wrong, stop and use `rozetext-login`.
- Only reply when the last message in the thread is incoming. No double-text, no cold DM.
- Caps: scan 5 threads per run (max 10), send 3 per run (max 5), 15 per day. One run per day unless the user asks again.
- Send window: 10:00 to 22:00 local time. Outside it, stop and wait.
- No links, no phone numbers, no emails, no promotion, no follow/save/comment asks, no prices.
- No message without explicit approval in the current conversation.
- Stop on any challenge, checkpoint, action block, rate limit, or login screen. Do not retry, do not switch accounts, do not clear cookies.
- One Chrome window on the page profile at a time.
- Never like, follow, save, story-view, or comment from this workflow.

## Run

### 1. Session

Load `rozetext-login` and follow it. The scan re-checks the account, so a stale `runtime/login.json` cannot fool it.

### 2. Scan (read-only)

```bash
npm run direct:admin -- --scan --limit=3
```

- Headed Chrome on the page profile.
- Opens the unread threads one by one, reads the header and text messages, and screenshots each conversation.
- The inbox row preview is the last-message signal. Attachments (photo, voice note, sticker) show up in the screenshot, not always in the text.
- Writes `runtime/direct-admin/threads.json` and `runtime/direct-admin/shots/<thread-id>.png`.
- Status: `runtime/direct-admin/run.json`.

Read `threads.json`. For each thread with `has_unanswered: true`, read the screenshot too. The parsed text is a convenience; the screenshot is the source of truth.

Opening a thread marks it read in Instagram. If you skip a reply, it will not appear as unread in the next scan. Reply in the same batch, or keep its `url` from `threads.json`.

### 3. Draft

Write only the replies you want to send to `runtime/direct-admin/replies.json`:

```json
[
  {
    "thread_id": "123456",
    "username": "someone",
    "reply_to": "a1b2c3d4e5f6",
    "text": "متن دقیق پاسخ",
    "approved_at": "2026-11-13T18:30:00.000Z"
  }
]
```

- `reply_to` is the `last_in` fingerprint from `threads.json`. It comes from the inbox row preview at scan time, not from the message text, so it still works when the last message is a photo or a voice note.
- Set `approved_at` only after the user approves. The send script refuses an entry without it and expires it after 24 hours.
- Leave out any thread you are not sure about. A skipped thread is not a failure.

Show the user a table: handle, one line of what they said, the exact reply. Ask once. Do not send in the same message.

### 4. Send

After explicit approval:

```bash
npm run direct:admin -- --send --limit=1
```

The first send on a new setup is one message, with the user watching. After that, the default is 3.

The script re-checks the account, the inbox row preview, the last message direction, the daily cap, the hour, the opt-out list, and the approval timestamp. If anything changed, it skips and says why.

### 5. Report

Report: sent, skipped with reason, escalated. If a reply is skipped with `row_not_found` or `thread_changed`, rescan before retrying. Do not paste private message text into a commit, a data file, or the dashboard.

After the batch, delete `runtime/direct-admin/shots/`, `runtime/direct-admin/profiles/`, and `runtime/direct-admin/threads.json` if the user does not need them. Keep `state.json` only for the cooldown and opt-out memory.

## Reading a thread

`threads.json` gives each thread:

- `username`, `display_name`, `is_group`, `messages` (last 20 text messages), `preview`, `last_in`, `last_message_direction`, `has_unanswered`, `skip_reason`, `screenshot`.

Only the last incoming message needs an answer. Earlier messages give context: name, what they asked, what was already promised.

- If the thread is a group, skip it. The script marks `is_group`.
- If the text is a sticker, emoji, reaction, or "seen", treat it as low signal. A short human line or skip.
- If the last message is a photo, voice note, or file, read the screenshot. Respond to what it is, not with a generic "thanks for sharing". If the screenshot is unclear, skip. Do not guess.
- If the last message is outgoing, skip. Do not double-text.

## Reply voice

Persian, warm, and conversational. Write like a real person replying to a DM, not like a caption, a poem, or an official email.

Default to "تو". Switch to "شما" only if they used it first, or the thread is clearly formal or business. On Instagram, "تو" is normal; "شما" in every line reads cold.

- 1 to 3 short sentences. One idea per sentence.
- Start from what they said, not from the page.
- One specific detail beats three generic compliments.
- Use everyday words: "ممنون", "قشنگ", "حالم", "دلم", "واقعاً", "خیلی".
- Use the way people actually type: "می‌تونم", "نمی‌دونم", "برام", "فرستادیش", "دوستش دارم".
- Warm, calm, confident. No begging, no over-apologizing, no "ممنون که با ما همراهید" boilerplate.
- No em dash. No AI phrases: "در دنیای امروز", "بیایید", "شگفت‌انگیز", "تجربه بی‌نظیر".
- No fake intimacy. "عزیز دلم" only if they used it first. "جان" after a visible name is fine when the thread is warm; not for a stranger.
- No religion, politics, health, or relationship advice. No promises about money, features, or dates.
- Emoji: at most one, only if they used one.
- Their name only if it is visible and unambiguous.
- Never reuse a reply text across threads. If two people say the same thing, answer the specific detail in each.
- The family feeling comes from recognition and consistency, not from calling them "family" in the first message.
- This is a poetry page. A poetic line is welcome when it comes from their message, not as decoration.
- If you cannot write something true and specific, skip.

### Sound like a DM, not a book

Avoid these in a reply:

| Bookish | Say instead |
|---|---|
| از اینکه ... سپاسگزاریم | ممنون که ... |
| بدین وسیله / با احترام | (حذف کن) |
| از این رو / لذا | برای همین |
| شایان ذکر است / لازم به ذکر است | یه نکته هم اینکه |
| می‌باشد / می‌نماییم | هست / می‌کنیم |
| همواره / پیوسته | همیشه |
| قدردانی می‌کنیم | ممنونیم |
| همراهی شما | همراهی‌ات |
| بسیار | خیلی |
| می‌توانید | می‌تونی |
| نمی‌دانم | نمی‌دونم |

- Read the reply out loud. If it sounds like a caption, a press release, or a school essay, rewrite it.
- No literary metaphor unless they used one first.
- No formal connector at the start of every sentence.
- One warm, specific sentence is better than three polite ones.

### Examples

- They share a line: "این خط رو دو بار خوندم. واقعاً نشست. ممنون که فرستادیش."
- They say "ممنون از پیجتون": "ممنون از تو که اینجایی. خوشحالم که یک خط از اینجا به روزت چیزی اضافه کرده."
- They send a photo: "این عکس حال و هوای قشنگی داشت. ممنون که فرستادیش."
- They ask a fact you do not know: "این رو باید چک کنم. نمی‌خوام حدس بزنم و اشتباه بگم. اگر پیدا کردم، می‌نویسم."

### Warmth check

Before writing `replies.json`, check each reply:

1. Would a real person type this in a DM?
2. Is there one detail from their message?
3. Is it 1 to 3 sentences?
4. Did I use "شما" when they used "تو"?
5. Is there a word I would never say out loud?
6. Is there a fake compliment or a promise?
7. Does the last line feel warm without asking for anything?

If any answer is wrong, rewrite it.

## Reply categories

- A real question: answer it, or say you will check and come back with a date. If you cannot verify the fact, escalate.
- A thank-you: accept it warmly and give one specific detail back.
- A poem or line they shared: respond to the feeling, not with a critique.
- A feature request: thank them, say it is noted, promise nothing.
- A business or collab request: short warm holding reply, then escalate to the user.
- A price or commission question: do not quote. Escalate.
- A compliment: receive it, return a specific one about their taste or their page, not their body.
- Spam, hate, harassment, minors, self-harm, legal threats, refunds, press: do not reply. Escalate.

## Compliments from a profile (optional)

Only if the thread gives a reason, and at most 3 profiles per run.

```bash
npm run direct:admin -- --profile=<handle>
```

- Reads the name, bio, and header text. No likes, follows, story views, or saves.
- Writes `runtime/direct-admin/profiles/<handle>.json` and a screenshot.
- Compliment craft: a line they wrote, their bio, the consistency of their page, a pinned post. Never appearance, age, money, or private life.
- One compliment, specific, then move on. Do not inventory their page.

## Loyalty levers (ethical)

Use these to make people feel recognized, not trapped.

- Belonging: use a community name only if it is real and already used by the page.
- Recognition: remember one detail from last time and use it.
- Reciprocity: give a small, real thing before asking for anything.
- Reliability: same voice, same window, no ghosting.
- Ritual: a weekly line or monthly prompt people can expect. No pressure to join.
- Co-creation: ask them to pick a word or theme, and credit the choice.
- Peak-end: make the last line the warmest, not a call to action.
- Boundaries: silence is allowed. One follow-up maximum, never guilt.
- Real social proof only: never invent numbers or testimonials.
- No dark patterns: no fake scarcity, no love-bombing, no FOMO, no engagement bait.

## Escalation

Stop and hand the thread to the user when:

- The person asks about money, orders, refunds, or a commission.
- The message is a legal threat, press request, or a request for personal data.
- The person is a minor, or the conversation turns sexual.
- The person mentions self-harm or a crisis.
- The person is aggressive, threatening, or asks for another follower's information.
- A fact cannot be verified and the reply would need a claim.

Do not send a holding reply to a crisis or a legal threat. Just escalate.

## Checks

`npm run direct:admin -- --self-test` tests the reply guards without opening Chrome: short text, links, em dash, expired approval, and changed thread.

## Script states

`runtime/direct-admin/run.json`:

- `ok`: read `threads.json` or the report.
- `no_work`: no unread threads, or no approved reply to send.
- `needs_session`: run `rozetext-login`, then retry once.
- `needs_account_check`: the script could not read the live handle. Open the profile manually; do not guess.
- `wrong_account`: stop. Do not log in from here.
- `profile_in_use`: close the other Chrome window on the page profile, then retry.
- `needs_human`: challenge or checkpoint. The user resolves it in Chrome. Stop.
- `selectors_failed`: no unread rows were found or Instagram changed the page. Do not guess. Read the screenshot and report.
- `draft_mismatch`: the text did not land in the composer. Nothing was sent. Check the page and retry once.
- `unverified`: the message may have been sent. Open the thread and check. Do not resend. If the thread shows no message, remove that thread id from `state.json` before a new scan.
- `outside_hours`: run later, or ask the user before using `--force-hours`.
- `daily_cap`: stop for today.
- `not_found` / `wrong_profile`: the profile mode could not open that handle. Report it.
- `stopped` / `closed`: the run ended early. Nothing else was sent.
- `error`: quote the message to the user.
