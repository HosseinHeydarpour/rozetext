# DESIGN: rozetext dashboard

**Direction:** the standard Material UI dashboard template. AppBar, a persistent right-hand Drawer, a KPI card row, X Charts and an X DataGrid, in RTL Persian. No bespoke design system on top: Material is the design, the brand only sets color, font and radius.

**Stack:** React 19 + TypeScript + Vite, `@mui/material` v9, `@mui/x-charts`, `@mui/x-data-grid`, `react-router-dom` (SPA).

## Palette

Theme is defined twice, once per color scheme, in `src/theme.ts`.

| Token | Light | Dark |
|---|---|---|
| primary | `#8E3B46` | `#E7A0A8` |
| secondary | `#2F6B5F` | `#8CC7B9` |
| background.default | `#F6F4F0` | `#0F1115` |
| background.paper | `#FFFFFF` | `#171A21` |
| text.primary | `#1B1A17` | `#F3F1ED` |

Primary is the account's red for views and men; secondary is the green for interactions, follows and women. Charts use these two only.

## Type

- Peyda for everything, self-hosted from `public/fonts` (Medium / Bold / Black woff2). No CDN, no second family.
- Headings `h4`–`h6` at weight 700; body at 400 (rendered by the Medium file), numbers via `Intl.NumberFormat('fa-IR')`.

## Modes

Light and dark are equal citizens. The scheme is chosen with `useColorScheme`, stored under `rozetext-mode`, and applied through `data-mui-color-scheme`; the toggle sits in the AppBar. Default is light.

## Routes

- `/` overview: range switch (7 ranges), four KPI cards, views line chart, follows bar chart, recent grid, top-by-saves.
- `/content`: full 18-row grid with watch time, top by saves, top by views.
- `/audience`: gender pie, age × gender bars, cities, countries, active hours, format split.

## Rules

- Every number comes from `src/data/snapshot.json`, which `scripts/build-dashboard-data.mjs` derives from `data/exports`. No metric is typed by hand; a missing one prints `بی‌داده`.
- Persian digits everywhere, including chart axes and chips. City and country names are translated in the build script; percentages are untouched.
- Tables and charts inherit theme colors, so both schemes work without per-component color logic.

## Placeholders

The drawer monogram (`ر` in a primary square) and the AppBar avatar are typographic placeholders until the owner supplies a real logo. No other image, testimonial or statistic was invented.
