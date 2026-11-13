---
name: rozetext-planner
description: "Schedule confirmed hunted texts into the page's follower-active windows, by score and by the mood archetype of each window. Writes data/content-hunt/plans/<date>.json. Load at the end of rozetext-content-hunt, or when the user asks for a posting plan."
---

# rozetext-planner

## What it does

Takes the confirmed texts from the day's hunt and places them on the next day's timeline:

- the highest scores go to the busiest follower windows
- the exact window inside a tier is chosen by the mood archetype
- low windows are dropped, not filled

It does not publish, schedule or queue anything on Instagram. It writes a plan.

## When to use

- At the end of `rozetext-content-hunt`, after the daily candidates file is written.
- When the user asks where to post a set of texts.

Not for the page's own 512 reels. They are already published.

## Inputs

| input | source | default |
|---|---|---|
| confirmed candidates | `data/hunted-candidates/<date>/candidates.json` | the latest day |
| follower active hours | `data/insights-account.json`, `ranges.7.parsed.active_times.days` | required |
| capacity | `--capacity` | 6 posts |
| plan date | `--date` | tomorrow, Asia/Tehran |

Use the fresh `data/insights-account.json`, not `data/main-database/insights-account.json`; the second file has the old broken parser.

## Run

```bash
npm run plan:content -- --date=2026-11-14 --capacity=6
```

- `--candidates=<path>` for a specific daily file.
- `--out=<path>` for a specific plan file.
- No candidates: the script prints `no confirmed candidates` and writes nothing.
- Missing active hours: the script stops. Do not invent activity.

## How it decides

1. Read the active hours of the plan date's weekday. If that day is missing, average all seven days.
2. Sort the eight 3-hour windows by follower activity.
3. Drop windows below 40% of the busiest window. In the current data that drops 15:00-18:00 and 18:00-21:00.
4. Split the remaining windows into tiers of three.
5. Sort the confirmed texts by score.
6. Give the top three scores the top tier, the next three the second tier, and so on.
7. Inside a tier, each text takes the window with the best mood fit. A tie goes to the busier window.

So the score decides how busy the window is; the mood decides which window in that tier.

The archetypes and the fit values are in `references/archetypes.md`. The full algorithm and output schema are in `references/scheduling.md`.

## Output

`data/content-hunt/plans/<date>.json`

Each slot carries:

```json
{
  "rank": 1,
  "window": "09:00-11:59",
  "start": "09:00",
  "archetype": "انرژی روز",
  "tier": 1,
  "activity": 37890,
  "activity_share": 0.16,
  "shortcode": "DfW7ev_zMTY",
  "score": 79,
  "theme": "خودشناسی",
  "theme_fit": 0.6,
  "caption": "کپشن آماده انتشار #رزتکست",
  "content": "متن دقیق روی ریل",
  "source_url": "https://www.instagram.com/reel/DfW7ev_zMTY/",
  "reasons": ["score 79", "theme fit 0.6", "tier 1", "activity 37890"]
}
```

`unscheduled` lists confirmed texts that did not fit the capacity.

The dashboard reads the plan at `GET /api/plan` (latest, or `?date=YYYY-MM-DD`). `GET /api/hunted` for a day also returns the matching `plan` object, joined by `shortcode`.

## Report

Give the user a Persian table:

| پنجره | آرکاتایپ | امتیاز | متن | چرا |
|---|---|---:|---|---|
| ۰۹:۰۰ تا ۱۱:۵۹ | انرژی روز | ۷۹ | کد ریل | بالاترین رده شلوغی، تطابق خلق ۰.۶ |

Also say:

- the plan file path
- which windows were dropped for low activity
- how many texts stayed unscheduled

## Rules

- Only `confirmed: true` candidates.
- Never more than 6 slots by default. Ask before going higher.
- Never fill a window below 40% of the peak. Empty is better than a dead slot.
- Do not invent active hours. If the data is missing, stop.
- The plan is a suggestion, not a publish. Nothing goes to Instagram from this skill.
- If the user changes the timezone or the audience, re-read the active hours; do not reuse an old plan.

## Integration

`rozetext-content-hunt` calls this skill after writing the daily candidates file:

```bash
npm run plan:content
```

The hunt report then includes the plan. The planner does not re-score or re-confirm anything; it only places what the hunt already confirmed.
