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

## Analyzer screen

One account (رز تکست), no switcher. Table: code, date, views, followers, shares, saves, tier, caption, «متن ریلز», prediction. Every cell is one line with the full text in a tooltip; clicking «متن ریلز» or «پیشبینی» opens the editor. Filters and the view-sort button sit at the left end of the card, search at the right.

- CSV import keeps `content`/`prediction` of existing reels, always replaces the caption and marks new rows green.
- Report dialog exports `.txt` (desktop format) or `.md` (summary table + per-reel details).
- Reset asks for `DELETE`.
- Removed on request: account switching, JSON content import, selection mode, manual flop.

## Creator screen

`/content/creator` is the post maker, built from the "Rozetext" Figma file (`WY3tdDSMwF6WiXVQRwY4t1`, section Post):

| | light | dark |
|---|---|---|
| text | `#292929` 90% | `#F4C466` 95% |
| highlight | `#8B2635` (red), white text | `#F4C466` (yellow), dark text |
| font | IRLotus 700 | IRLotus 700 |
| cover font | IRTitr 400 | IRTitr 400 |

- Canvas is 1080×1920 and is the preview itself, so the PNG export (`toBlob`, guide hidden) matches what you see.
- Text alignment is a toggle: centred on the safe box, or flush to its right edge. Both wrap at the safe width.
- «محدود کردن ارتفاع متن داخل کادر امن» keeps a long paragraph inside the safe box by scaling type down (never up) and, as a last guard, dropping the overflow lines; turning it off lets the text run past the guide.
- Background art is exported straight from the Figma frames into `public/creator/`: `dark-text.png`, `dark-cover.png`, `light-cover.png`, `light-text.png`. Switching mode or kind swaps the art (and resets the vertical offset for covers). A real file upload replaces it.
- Controls: mode (light/dark), kind (cover hook / body), alignment (centred or flush right), font size, line height, vertical and horizontal position, text colour, highlight colour, background image, highlight effect, safe-area edges.
- Horizontal and vertical sliders move the block but are clamped to the safe box, so text can never leave it. All four safe-area edges are editable and the dashed guide follows them.
- Highlight effect is either a box behind the run (accent fill, contrast text picked from the fill's luminance) or a text-only recolour. `*word*` marks the run in both.
- Text colour, highlight colour, safe area, highlight effect, alignment and horizontal offset are stored in `localStorage` under `rozetext-creator`, so the setup survives a reload; each colour picker has a «پیش‌فرض» reset.
- `*word*` marks a highlighted run; the band is drawn from measured glyph positions, then the run is re-drawn in the accent's contrast color.
- Fonts are self-hosted from `public/fonts`: `IRLotus-Regular.ttf`, `IRLotus-Bold.ttf`, `IRTitr-Regular.ttf` (copied from the system fonts the design uses).

The reel-audio card prefills a reel link from `data/main-database/reels_database.json`. «ساخت کلیپ با یک کلیک» renders a clean frame (the guide is never baked in) and sends it with the link to `/api/clip`, which extracts the audio with yt-dlp and muxes it with the still frame through ffmpeg (1080×1920, H.264 + AAC, `-shortest`); «فقط صدا» returns the m4a alone. No Instagram session is needed for public reels; private ones fail with the yt-dlp error shown in the card.

## Settings

`/settings/telegram` reads the bot catalog from `bot/skills.mjs` and the token state from `.env` through `/api/telegram` (the token value is never returned; it only calls Telegram `getMe` to prove the connection). It lists each skill with its label, summary, when-to-run line and steps, plus the `npm run bot` command. The section holds only this screen for now.

## Schedule screen

`/content/schedule` («محتوای آماده انتشار») reads `data/content-hunt/plans/<date>.json` through `/api/schedule` and lays the next seven days out as selectable day cards, starting today in Asia/Tehran. Each card shows the weekday, the Jalali date and how many texts are planned; clicking it opens that day's slots: window, start time, score, archetype, theme, follower activity, the reel text, the caption and a link to the source reel. Slots the planner could not place are listed separately.

- «ساخت برنامهٔ این روز» posts to `/api/plans`, which runs `scripts/plan-content.mjs --date=…` and reloads the week. With no confirmed texts it says so instead of failing.
- «ساخت پست» opens the creator with `?date=&shortcode=`, so the reel text and a derived cover hook are already in place.
- «خروجی کل روز» renders a cover and a text post per slot with the shared canvas renderer and downloads them as `<date>-<rank>-cover.png` / `-text.png`.

## Benchmark accounts screen
`/content/benchmark` reads `data/benchmark-accounts/benchmark_accounts.json` through `/api/benchmark` and shows one card per account: avatar (from the stored base64), Persian name, handle, cluster chip, followers/posts/following, average and record views, the content style and the matching archetypes. Four KPI cards (accounts, total followers, median, max) sit above a search field and a sort selector (followers / posts / alphabetical).

## Where it departs from the Figma file

- Content is real: no Lorem Ipsum, no "Jaydon Frankie", no invoice rows. The banner says what the page actually did (`۱۹ میلیون ویو …`), the featured card is the best reel, the table is the five latest reels, the donut is age share of the real audience.
- The Figma area chart is a plain two-line chart; ours is one line with the range selector wired to the seven exported ranges.
- The Figma "Current Download" donut has 4 arbitrary slices; ours shows six real age buckets and the real follower total in the center.
- The Figma page ships a photo in the featured card. There are no reel thumbnails in the data, so the card uses a brand gradient and the caption.
- Chart x-axis labels are rendered as a label row under the chart (MUI X v9 renders empty tick labels when the axis is fed raw ISO dates).
- The "active times" export carries all seven days and the best slot, so the audience screen shows a day-by-day bar chart with the peak hour marked.

## Type

Peyda everywhere, self-hosted from `public/fonts` (Medium / Bold / Black). Persian digits through `Intl.NumberFormat('fa-IR')`, including axes and chips. The design's Public Sans is not loaded; Peyda keeps the same sizes and weights.

## Modes

Light and dark are both first-class: `useColorScheme`, stored under `rozetext-mode`, applied through `data-mui-color-scheme`. Default is light, matching the Figma frame.
