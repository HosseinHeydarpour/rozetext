# Scoring model

Version 2 is a heuristic built from the page's own 512 reels (2026-08-14 to 2026-11-11). It ranks candidates. It is not a calibrated probability, and the report must say so.

Base rate: 111 of 512 reels reached 300K or more. That is 21.7%.

The selection bar is **score > 65**. The page publishes a lot of texts, so average candidates are not worth a slot.

## What the 512 reels say

| signal | with | without |
|---|---|---|
| 8-15 lines | 62K median, 21% viral | 17K, 10% for 3-8 lines |
| 15-25 lines | 207K median, 41% viral | 9.1K, 0% for 1-3 lines |
| 300-600 characters | 115K median, 30% viral | 13K, 5% under 120 |
| letter or address hook | 201K, 50% viral (n=10) | 49K, 21% |
| quote or dialogue hook | 254K, 50% viral (n=8) | 49K, 21% |
| first person | 87K | 42K |
| direct address (`تو`, `خودت`) | 93K | 40K |
| Persian question mark | 62K, 32% viral | 47K, 20% |
| opens with `وقتی` or `گاهی` | 36K, 19% viral | 51K, 22% |
| first line under 25 characters | 42K, 19% viral | 56K, 24% |

Viral posts by line count: 0 of 111 had 1-2 lines, 14 had 3-7, 58 had 8-14, 39 had 15+.

The correlation between line count and log views is r = 0.384. Length helps, it does not decide alone.

Publish date is not scored. An old text that beat its own account is still a valid source.

## Formula

Score 0-100. `fit` 0-60, `proof` 0-30, `novelty` 0-10.

### Fit (0-60)

Start at 0 and add:

| feature | points |
|---|---:|
| 15-25 lines | +24 |
| 8-14 lines | +17 |
| 5-7 lines | +5 |
| 1-4 lines | -16 |
| letter/address hook | +14 |
| quote/dialogue hook | +14 |
| question in the first line | +6 |
| opens with `وقتی` / `گاهی` / `بعضی` | -6 |
| first line under 25 characters | -4 |
| first person (`من`, `خودم`) | +6 |
| direct address (`تو`, `خودت`, `دلت`) | +6 |
| theme in the strong group | +5 |
| caption has a send CTA (`بفرست`) | +3 |
| caption has 2 or more hashtags | -2 |

Clamp to 0-60.

Strong themes (median views in the 512): grief and loneliness 95K, distance and leaving 74K, family and mother 56K, karma and justice 52K, love and relationships 51K. Weak: friendship 22K, pride and boundaries 27K, hope 30K, calm and acceptance 37K.

### Proof (0-30)

`lift = source views / source account median views`.

| lift | points |
|---|---:|
| 4x or more | 30 |
| 2x to 4x | 20 |
| 1.5x to 2x | 10 |
| under 1.5x | reject before scoring |
| no median | 0, and cap the total at 70 |

### Novelty (0-10)

Similarity against the page's 512 reels and against the other candidates: character 3-grams, Jaccard, after dropping spaces, punctuation and diacritics.

| similarity | points |
|---|---:|
| under 0.35 | 10 |
| 0.35-0.50 | 5 |
| 0.50-0.60 | 0 |
| 0.60 or more | reject |

## Bands

| band | score | prior viral rate | action |
|---|---:|---|---|
| A | 66-100 | 40-50% | selected, copied to `accounts.Default` |
| B | 45-65 | 20-30% | rejected, kept in the queue for audit |
| C | 0-44 | under 10% | rejected |

The priors come from the closest cohorts in the 512: the letter and quote hooks at 50%, 15+ lines at 41%, the base rate at 22%, short texts under 10%.

A text that scores 79 is not "79% likely to go viral". It sits in the band whose observed hit rate is 40-50%.

## Hooks

Classify the first line into one label:

- `letter`: starts with `خطاب به`, `نامه`, `آخرین پیام`, `از من می‌شنوید`, `بخوان`
- `quote`: starts with `گفت`, `نوشته بود`, `نوشت`, `یکی ازم پرسید`, `پرسیدم`
- `question`: contains `؟` in the first line
- `scene`: starts with `وقتی`, `گاهی`, `بعضی`, `یه روز`, `روزی`
- `statement`: everything else

## Themes

One label, first match wins:

| theme | keywords |
|---|---|
| `غم/تنهایی` | تنها, غم, درد, اشک, زخم, خسته |
| `دوری/جدایی` | جدایی, دوری, رفتن, خداحافظ, ترک, بی‌تو |
| `عشق/رابطه` | عشق, دوستت, رابطه, قلب, دلبر, یار |
| `مادر/خانواده` | مادر, پدر, خانواده, بچه, دختر, پسر |
| `کارما/عدالت` | کارما, عدالت, حق, مکافات |
| `غرور/مرز` | غرور, مرز, احترام, حد |
| `آرامش/پذیرش` | آرامش, آروم, پذیرش, رها, سکوت |
| `خودشناسی` | خودت, رشد, تغییر, ارزش |
| `رفاقت` | رفیق, دوست, همراه |
| `امید` | امید, آرزو, رویا, بهتر |

## Why this is allowed to be wrong

The 512 posts are the page's own reels, so the model learns the page's reach at the time, not only the text. `proof` and the bands are the correction. The model will be recalibrated with real outcomes:

1. After 20 measured posts, compute the viral rate of A, B and C.
2. If A does not beat B by at least 15 points, refit the weights on the measured set.
3. Record every change in `data/content-hunt/model.json` with the date and the reason.

Never present the score as a promise. Say "band A, prior 40-50% from the page's history".
