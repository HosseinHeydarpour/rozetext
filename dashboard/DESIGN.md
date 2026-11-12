# DESIGN: rozetext dashboard

**Direction:** a printed report on paper, not a SaaS console. The page belongs to a Persian poetry and typography account, so it borrows the grammar of a literary journal: paper stock, ink, one stamped accent, large Naskh numerals, and hairline rules instead of cards floating in space.

**Dials:** ENERGY 5 / RHYTHM 4 / MOTION 1.

- ENERGY 5: the numbers and the Naskh display carry the page; no decorative noise.
- RHYTHM 4: the hero KPI, the chart, the content table and the audience block have different weights, not one uniform card grid.
- MOTION 1: static report. Only native focus states and no entrance animation.

## Palette

| Token | Value | Use |
|---|---|---|
| paper | `#F3EDE2` | page ground |
| surface | `#FBF8F2` | report panels |
| ink | `#17130F` | text and data |
| muted | `#6E6257` | labels and secondary text |
| line | `#DCD2C3` | hairlines |
| accent | `#8E2F2F` | save rate, women series, story share |

The accent is reserved for data encoding and one quality metric; it is not a button color.

## Type

- Vazirmatn for UI and prose.
- Noto Naskh Arabic for the headline, section headings and numerals. The serif numerals are the identity; they are not a generic display font.

## Written reasons for techniques that need one

- **Uppercase masthead with wide tracking (R-06):** the overline is the journal masthead, `ROZETEXT.IR · داشبورد رشد`, not a generic eyebrow. Tracking separates the Latin domain from the Persian body and matches the printed-report direction.
- **Hairline panels, no shadows (R-12):** the report sits on paper; elevation would imply floating app cards, which contradicts the direction.
- **Dense table (R-14):** content analysis is the job, so the table is allowed to be dense; the KPI block above it carries hierarchy instead of adding more cards.
- **Red accent:** save rate and the women series are the two readings the page is built to surface; the story share uses the same accent in the format bar. No other red.

## Non-goals

No glass, no gradients, no glow, no grid background, no dark-mode default, no invented metrics. If a number is missing, the UI says `بی‌داده` instead of filling the gap.

## Placeholders

The sidebar monogram (`ر` in an ink square) is a typographic placeholder until the owner supplies the page's real logo or avatar. No other logo, avatar, testimonial or statistic was invented.
