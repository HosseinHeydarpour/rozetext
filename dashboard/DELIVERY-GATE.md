# Delivery Gate: rozetext dashboard

Build: `npm run build` in `dashboard/` passes (`next build`, TypeScript included, 0 errors). Runtime: four routes render, both color schemes apply, no console errors.

## Design fidelity against the Figma file

Measured in the running app and compared to the Figma node data (`1:4641` dashboard frame):

- Card radius 16, shadow `0 0 2px rgba(145,158,171,.20), 0 12px 24px -4px rgba(145,158,171,.12)`, padding 24 — PASS (computed styles read from the DOM).
- Drawer 280, header 80 with `rgba(255,255,255,.80)` + `blur(6px)`, page ground `#F4F6F8` — PASS.
- Card heights: banner 280, featured 280, KPI 166 — PASS (measured 280/280/166/166/166).
- Palette `#00A76F` / `#5BE49B` / `#007867` / `#004B50` / `#212B36` / `#637381` / `#919EAB` — PASS, taken from the node fills, not guessed.
- Type: h4 24/700, h6 18/700, KPI numbers 32/700, body 14, caption 12 — PASS.
- Grid: 8+4, 4+4+4, 4+8, 8+4, 4+4+4 with 24 px gaps — PASS.
- Dark scheme: ground `#161C24`, paper `#212B36`, banner switches to a dark gradient — PASS (screenshot).

## Block 1: Hard Gate

- R-02 PASS: no em dash in rendered dashboard text.
- R-03 PASS: no horizontal document overflow at 1518 px; the tables scroll inside their card.
- R-17 PASS: every number comes from `data/exports` (snapshot) or `data/main-database/reels_database.json`. No hand-typed metric.
- R-18 PASS: no testimonials or invented people.
- R-23 PASS: the drawer monogram and AppBar avatar are placeholders.
- R-24 PASS: `/`, `/content`, `/content/analyzer`, `/audience` all resolve; menu «محتوا» holds the analyzer first.
- R-25 PASS: light text `#212B36` on `#F4F6F8` ≈ 15.4:1; dark `#FFFFFF` on `#161C24` ≈ 16.8:1.
- R-26 PASS: range selector, theme toggle, search (navigates to the analyzer with `?q=`), analyzer dialogs and imports all act.
- R-27 PASS: missing metrics print `—` or `بی‌داده`; analyzer save failures surface in an alert.
- R-28 PASS: no FAQ.
- R-32 PASS: MUI controls are native buttons and links; visible focus ring.
- R-39 PASS: `lang=fa`, `dir=rtl`, title, header/main/nav landmarks, labelled icon buttons.
- R-40 PASS: no media; Peyda self-hosted; no performance claim.

## Block 2: Analyzer (port of `instagram_analyzer_app.py`)

- Load PASS: 512 reels, 118.9M total views, median 50,025, 111 viral / 344 mid / 57 flop.
- Edit PASS: saving manual content wrote through to `data/main-database/reels_database.json`.
- Flop PASS: toggle writes only `is_flopped` for that item.
- CSV PASS: two-row import reported «۲ ریل جدید» and created them under the active account only.
- JSON PASS: «۱ محتوا آپدیت شد، ۱ ریل پیدا نشد».
- Report PASS: downloaded `.txt` matches the desktop header, tier badges and field order.
- Accounts PASS: create switches account, previous account keeps its 512 items.
- Row flags: new rows tint green; updated rows get an amber dot (tinting every updated row made the table unreadable, since 398 of 512 carry that flag).

## Block 3: Purpose-Gate

- R-01 PASS: no gradients beyond the two the Figma file itself uses (banner, featured card, two teal/blue stat cards).
- R-04 PASS: functional nav and utility icons only.
- R-09 PASS: chips are `size="small"` status labels, not capsule CTAs.
- R-10 PASS: no glassmorphism beyond the header blur in the file.
- R-12 PASS: card shadow is the file's two-layer shadow, not decoration.
- R-14 PASS: 8+4 / 4+4+4 / 4+8 / 8+4 / 4+4+4, deliberately uneven.
- R-19 PASS: no entrance animation; only MUI's drawer and ripple transitions.
- R-22 PASS: the banner's illustration is a geometric brand shape, not stock art.

## Block 4: Craftsmanship

- C-1 PASS: every token is traced to a Figma node in `DESIGN.md`.
- C-2 PASS: no dead control; the header search routes to the analyzer.
- C-3 PASS: every block is a real reading.
- C-4 PASS: verified at 1518 px and 390 px (single column below `md`, drawer becomes temporary, tables scroll inside the card).
- C-5 PASS: no fabricated statistic or claim.
- R-16 PASS: no AI marketing buzzwords in the UI.
- R-21 PASS: light and dark both complete.
- R-29 PASS: green primary, blue info, grey neutrals; purple is not used in charts.

**Gate status: PASS.** Known gap: the `activeTimes` export is malformed (labels and values transposed), so no active-hours chart is shown until the scraper is fixed.
