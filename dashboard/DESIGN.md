# DESIGN: rozetext dashboard

**Source:** the Figma community file "Material UI Dashboard Screen (Community)" (`UWCfsFjGebg9Ve55GTWv5s`), frame `App` / `analytics`. Layout, spacing, radii, shadows, type sizes and colors are taken from that file's node data, not approximated by eye.

**Stack:** Next.js 16 App Router + React 19 + TypeScript, `@mui/material` v9, `@mui/x-charts`, `@mui/x-data-grid`, Emotion RTL cache via `@mui/material-nextjs`.

## Measured tokens (from Figma)

| Token | Value | Where it came from |
|---|---|---|
| primary | `#00A76F` | Go Now button, active nav item |
| primary light | `#5BE49B` | banner gradient, featured label |
| primary dark | `#007867` | banner text tint, teal stat card |
| primary darker | `#004B50` | banner heading |
| info dark | `#006C9C` | blue stat card |
| success | `#22C55E` | trend arrows |
| error | `#FF5630` | notification badge |
| text primary | `#212B36` | all headings and numbers |
| text secondary | `#637381` | table headers, captions |
| text disabled | `#919EAB` | section labels, axis ticks |
| background | `#F4F6F8` | page ground |
| paper | `#FFFFFF` | cards, drawer |
| divider | `rgba(145,158,171,0.20)` | hairlines |
| card radius | 16 px | every card |
| card shadow | `0 0 2px rgba(145,158,171,.20), 0 12px 24px -4px rgba(145,158,171,.12)` | card frame effect |
| drawer | 280 px | sidebar frame |
| header | 80 px, `rgba(255,255,255,.80)` + blur 6 | header frame |
| grid gap | 24 px | dashboard grid |
| card padding | 24 px | card content |
| type | h3 32/700, h4 24/700, h6 18/700, body 14, caption 12 | text nodes |

Dark scheme is the same geometry with `#161C24` ground, `#212B36` paper and `#919EAB` secondary text. Literal colors that must differ per scheme use `theme.applyStyles('dark', …)`, because `theme.palette.mode` is static under CSS variables.

## Layout, as in the file

1. Welcome card (8 cols) + featured reel card (4).
2. Three KPI cards (4 each), 166 px tall.
3. Age donut (4) + views line chart (8).
4. Recent reels table (8) + top reels by saves (4).
5. Cities (4) + countries (4) + two ring stat cards (4).

The analyzer and audience screens reuse the same card, header and type rules instead of inventing new ones.

## Where it departs from the Figma file

- Content is real: no Lorem Ipsum, no "Jaydon Frankie", no invoice rows. The banner says what the page actually did (`۱۹ میلیون ویو …`), the featured card is the best reel, the table is the five latest reels, the donut is age share of the real audience.
- The Figma area chart is a plain two-line chart; ours is one line with the range selector wired to the seven exported ranges.
- The Figma "Current Download" donut has 4 arbitrary slices; ours shows six real age buckets and the real follower total in the center.
- The Figma page ships a photo in the featured card. There are no reel thumbnails in the data, so the card uses a brand gradient and the caption.
- Chart x-axis labels are rendered as a label row under the chart (MUI X v9 renders empty tick labels when the axis is fed raw ISO dates).
- The "active times" export parses into `{"12a":3,"3a":6,…,"9p":31454}` — labels and values are transposed, so the screen does not show an active-hours chart. It needs a fix in the scraper before it can be trusted.

## Type

Peyda everywhere, self-hosted from `public/fonts` (Medium / Bold / Black). Persian digits through `Intl.NumberFormat('fa-IR')`, including axes and chips. The design's Public Sans is not loaded; Peyda keeps the same sizes and weights.

## Modes

Light and dark are both first-class: `useColorScheme`, stored under `rozetext-mode`, applied through `data-mui-color-scheme`. Default is light, matching the Figma frame.
