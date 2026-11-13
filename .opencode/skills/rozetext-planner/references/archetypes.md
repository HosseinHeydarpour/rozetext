# Hour archetypes

The follower activity decides how busy a window is. The archetype decides which text belongs in it.

The eight windows come from the dashboard's active-hours buckets. Each is three hours wide.

| key | window | archetype | mood | primary themes | secondary themes |
|---|---|---|---|---|---|
| `12a` | 00:00-02:59 | سکوت شب | sleepless, unsent words, quiet sadness | غم/تنهایی, دوری/جدایی | غرور/مرز, عشق/رابطه |
| `3a` | 03:00-05:59 | بغض نیمه‌شب | raw pain, anger, letting go | غم/تنهایی, غرور/مرز | کارما/عدالت, دوری/جدایی |
| `6a` | 06:00-08:59 | شروع دوباره | waking up, hope, calm | امید, آرامش/پذیرش, خودشناسی | عشق/رابطه |
| `9a` | 09:00-11:59 | انرژی روز | clarity, boundaries, self-worth | خودشناسی, غرور/مرز, کارما/عدالت | عشق/رابطه, امید |
| `12p` | 12:00-14:59 | ارتباط | love, family, connection | عشق/رابطه, مادر/خانواده, رفاقت | آرامش/پذیرش |
| `3p` | 15:00-17:59 | خستگی عصر | tired, nostalgic, distant | غم/تنهایی, دوری/جدایی, آرامش/پذیرش | عشق/رابطه |
| `6p` | 18:00-20:59 | خانه | home, gratitude, soft love | مادر/خانواده, عشق/رابطه | آرامش/پذیرش, رفاقت |
| `9p` | 21:00-23:59 | خداحافظی | closure, reflection, goodbye | دوری/جدایی, غرور/مرز | غم/تنهایی, کارما/عدالت, عشق/رابطه |

## Fit values

| match | value |
|---|---:|
| primary theme | 1.0 |
| secondary theme | 0.6 |
| anything else | 0.2 |

A 0.2 is not a rejection. It means the mood is a weak match; the score and the activity still decide.

## How the planner uses it

1. The score sorts the texts.
2. The busiest three windows form tier 1, the next three tier 2, the last two tier 3.
3. The top three scores go to tier 1. Each one takes the window in that tier with the best fit; a tie goes to the busier window.
4. The next three scores go to tier 2, same rule.
5. Tier 3 is only used when capacity is above 6 and the windows pass the activity floor.

The result: a 82 that fits 03:00 perfectly stays in tier 1 at 03:00, while a 78 takes the busiest 09:00. The top scores still sit in the busiest tier; the exact window matches the mood.

## Why these moods

The page's strongest themes are grief and loneliness, distance and leaving, love, and family. The windows follow the day's emotional arc:

- night: the unsent and the unresolved
- morning: the reset and the calm
- midday: the connection
- evening: the home
- late evening: the goodbye

The map is a heuristic. The active hours are measured; the moods are not. Revisit the map if the feedback loop shows that a theme performs better in a window than this table predicts.
