# Delivery Gate: rozetext dashboard prototype

Build: `npm run build` in `dashboard/` passes (`tsc -b` + `vite build`, 0 errors). Runtime check on the dev server: three routes render, both color schemes apply, console has 0 errors.

## Block 1: Hard Gate

- R-02 PASS: no em dash in rendered dashboard text.
- R-03 PASS: no horizontal document overflow at the 985 px test width; drawers, grids and charts size to their containers.
- R-17 PASS: every number comes from `data/exports` through `scripts/build-dashboard-data.mjs`. No hand-typed metric.
- R-18 PASS: no testimonials or invented people.
- R-23 PASS: the drawer monogram and AppBar avatar are declared placeholders in `DESIGN.md`.
- R-24 PASS: three routes with real screens: `/`, `/content`, `/audience`; every nav item resolves.
- R-25 PASS: light text `#1B1A17` on `#F6F4F0` ≈ 15.9:1; dark text `#F3F1ED` on `#0F1115` ≈ 17.3:1.
- R-26 PASS: all seven range buttons swap the chart data; theme toggle and every nav item act.
- R-27 PASS: a missing metric prints `بی‌داده`; data is bundled so no loading state applies.
- R-28 PASS: no FAQ.
- R-32 PASS: MUI controls are native buttons and links; visible focus ring on Tab.
- R-39 PASS: `lang=fa`, `dir=rtl`, page title, `header`/`main`/`nav` landmarks, labelled icon buttons.
- R-40 PASS: no media; Peyda is self-hosted; no performance claim.

## Block 2: Purpose-Gate

- R-01 PASS: no gradients or glows; MUI paper and flat charts only.
- R-04 PASS: four functional nav/utility icons from `@mui/icons-material`; no decorative sets.
- R-06 PASS: no overline/eyebrow on the pages.
- R-09 PASS: chips are MUI `size="small"` status labels, not capsule CTAs.
- R-10 PASS: no glassmorphism.
- R-12 PASS: outlined cards on the MUI surface; elevation is not used as decoration.
- R-14 PASS: KPI row is 4/2/1 columns by breakpoint, the charts and grid below carry different weights.
- R-19 PASS: no entrance animation; only MUI's own transitions on the drawer and toggles.
- R-22 PASS: no illustrations.

## Block 3: Liveliness

- Direction PASS: standard MUI dashboard, stated in `DESIGN.md`.
- Consistency PASS: one primary/secondary pair across charts, chips and progress bars.
- Focal point PASS: the KPI row leads, then the views line chart.
- Identity PASS: Peyda plus the account's red/green roles keep it from reading as the stock template.

## Block 4: Craftsmanship & Quality Locks

- C-1 PASS: theme, palette and routes are documented with reasons.
- C-2 PASS: no dead control; every button and link has an effect.
- C-3 PASS: every block is a real reading (growth, views, engagement, saves, audience).
- C-4 PARTIAL: desktop verified (build, routes, both schemes, console). Mobile relies on MUI responsive props and was not visually verified — the browser tool cannot resize the viewport.
- C-5 PASS: no fabricated statistic or claim.
- R-16 PASS: no AI marketing buzzwords in the UI.
- R-21 PASS: light and dark are both first-class, no deferred toggle.
- R-29 PASS: one primary, one secondary, neutrals; charts use only those two.

**Gate status: PASS, with C-4 recorded as partial (mobile not visually verified).**
