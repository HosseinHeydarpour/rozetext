# Scheduling

## Activity source

`data/insights-account.json`, `ranges.7.parsed.active_times`:

- `days` holds the seven weekdays, each with eight 3-hour buckets.
- `best` holds the peak day and hour.
- `selected_day` and `hours` are a preview of one day; do not use them for a plan.

If the plan date's weekday exists in `days`, use it. Otherwise average the seven days and record `days.average` in `activity_source`.

The buckets are:

`12a` 00:00, `3a` 03:00, `6a` 06:00, `9a` 09:00, `12p` 12:00, `3p` 15:00, `6p` 18:00, `9p` 21:00.

## Algorithm

1. Read the confirmed candidates. Drop anything without `confirmed: true`.
2. Sort the eight buckets by activity, descending.
3. Compute the floor: 40% of the busiest bucket. Drop buckets below it. On the current data this removes `3p` and `6p`.
4. Take the top `capacity` buckets, default 6.
5. Split those buckets into tiers of three: tier 1, tier 2, tier 3.
6. Sort the candidates by score, descending.
7. Tier 1 takes the next three candidates. For each, in order, pick the bucket in the tier with the highest mood fit; a tie goes to the higher activity. Remove the bucket.
8. Tier 2 takes the next three, same rule.
9. Tier 3 takes any remaining candidates if capacity allows.
10. Sort the filled slots by activity and number them from 1.
11. The rest of the candidates go to `unscheduled` with reason `capacity`.

## Output

`data/content-hunt/plans/<date>.json`

```json
{
  "date": "2026-11-14",
  "timezone": "Asia/Tehran",
  "capacity": 6,
  "source_file": "data/hunted-candidates/2026-11-13/candidates.json",
  "activity_source": "data/insights-account.json ranges.7.parsed.active_times.days.Sa",
  "activity_fetched_at": "2026-11-13T16:27:14.247Z",
  "generated_at": "2026-11-13T17:12:34.698Z",
  "slots": [
    {
      "rank": 1,
      "key": "9a",
      "start": "09:00",
      "window": "09:00-11:59",
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
  ],
  "unscheduled": [
    { "shortcode": "DfXXXX", "score": 67, "reason": "capacity" }
  ]
}
```

## Edge cases

| case | behavior |
|---|---|
| no confirmed candidates | print `no confirmed candidates`, write nothing |
| active hours missing | stop with an error; do not invent activity |
| plan date weekday missing | average the seven days and say so in `activity_source` |
| fewer candidates than capacity | fill the top windows only; leave the rest empty |
| more candidates than capacity | the rest go to `unscheduled` |
| capacity above 6 | the low windows still need to pass the 40% floor; usually they do not |
| all activity zero | stop with an error |

## Rules

- The plan date is in `Asia/Tehran`.
- A window is a suggestion, not an exact minute. The page can post anywhere inside it.
- The plan never publishes. It is a file and a report.
- The score comes from the hunt. The planner does not re-score or re-confirm.
- A text that is not confirmed never appears in a plan.

## Current data

Peak: Monday 09:00-11:59 with 38,216 active followers.

Daily shape: strong from 00:00 to 14:59, a deep dip from 15:00 to 20:59, recovery from 21:00.

That dip is why the default plan uses six windows and drops the two afternoon ones. Filling them would be posting into the quietest part of the follower day.
