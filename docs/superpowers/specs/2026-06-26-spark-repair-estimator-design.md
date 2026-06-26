# Spark Homes Repair Estimator — Design Spec

**Date:** 2026-06-26
**Author:** Likitha Tadakala
**Context:** Spark Homes Developer Contest submission. Goal: a complete, polished, top-10 submission in ~20–25 hours. Submit by 2026-07-12/13 (deadline 2026-07-14).

---

## 1. What we are building

A mobile-first repair-cost estimator **PWA** for Spark Homes acquisition agents. Agents walk a distressed property on a phone (often poor cell service), drill into rooms, check off needed repairs, enter quantities, attach photos, and read a live repair total. They export the estimate as a ZIP (styled Excel cost breakdown + photos). The app installs to the home screen and works fully offline.

This is original work. The provided reference app is used for scope only — our architecture, navigation, styling, and storage are deliberately different and better.

## 2. Hard constraints

- Small set of static files (no build tools, no required server, no framework). Native ES modules.
- Vanilla JS/HTML/CSS; CDN libraries allowed but cached for offline.
- Real PWA: service worker + web app manifest; installable on Android/iOS; standalone display.
- All project data in localStorage; photos in IndexedDB. App works fully offline after first load.
- Mobile-first. Must work on Chrome for Android and Safari for iOS.
- Hosted on GitHub Pages (a required deliverable; also satisfies the HTTPS context PWAs need).

## 3. Key technical decisions (the three forks)

1. **Hand-authored CSS, not Tailwind CDN.** A small design system using CSS custom properties for the Spark palette (burnt orange + dark `#111827`) and component classes (cards, buttons, inputs, sheets). Faster first paint, no dev-only CDN warning, fully offline, original, strong code-quality signal. (~350 lines.)
2. **IndexedDB for photos (Blobs), localStorage for everything else.** Project state references photo IDs; blobs live in IDB — no 5–10MB quota cliff and no silent photo loss (the reference's failure mode). ~40-line promise wrapper.
3. **Surgical DOM updates on the hot path, no framework.** Event delegation at the app root. Toggling an item or typing a quantity updates only that line total, its group/room/header totals, and the progress bar — never a full re-render, so focus and scroll never jump. Screen transitions re-render only the affected region.

## 4. Navigation model

Drill-down (scales to any number of rooms; the reference's fixed horizontal tabs do not):

- **Project screen** — large always-visible running total, progress bar, list of room cards (name, subtotal, group-completion), and actions: **+ Add Room**, **Export**, **Deal Analyzer**, **Settings**, project switcher.
- **Room detail** — collapsible groups for that room; each group has its line items + a **"No Action Needed"** toggle + photo attach. Back returns to the project screen.
- **Deal Analyzer**, **Settings (global pricing, add/remove items)**, and **project switcher** are reachable from the project screen.

## 5. Data model

### Catalog (static, derived from the CSV — single source of truth for pricing)

```
ITEMS       itemId → { id, name, cost, unit, meta }       // parsed from Pricing List.csv (108 items)
GROUP_DEFS  groupId → ordered [itemId]                     // Flooring, HVAC, Closet, Lighting, …
ROOM_TYPES  typeId → { label, groups:[groupId], singleton? }
  Bathroom        → [vanity, tub, tile]
  Kitchen         → [cabinets, counters, appliances]
  Interior/General→ [flooring, paint, doors, pest]
  Systems         → [hvac, electrical, structural, insulation]
  Exterior        → [fence, siding, windows, garage, trees]
  Bedroom         → [flooring, paint, doors, closet]
  Living/Common   → [flooring, paint, doors, lighting]
```

- **Closet** and **Lighting** have no dedicated CSV items → they are mapped to relevant **existing** CSV items (Closet → Bifold Door `ig-12` + Door Hardware `ig-11`; Lighting → Light Fixtures `ig-22` + Switches/Outlets `as-10`), keeping the CSV as the single source of truth. Agents add anything else (e.g. closet shelving) via the required add-item feature. This makes Bedroom and Living/Common real, decoupled rooms per the brief's note that these are currently lumped into Interior/General.
- Every group renders a **"No Action Needed"** control (state on the group, not a fake line item).

### Project (per project — localStorage)

```
{
  id, name, notes, createdAt, updatedAt,
  rooms: [ { instanceId, typeId, label } ],          // e.g. "Bedroom 1"
  selections: { [instanceId]: { [itemId]: { checked, qty, year, note } } },
  noAction:   { [instanceId]: { [groupId]: bool } },
  photoRefs:  { [instanceId|itemId]: [photoId] },     // blobs in IndexedDB
  priceOverrides: { [itemId]: cost },                 // PER-PROJECT override
  deal: { arv, purchasePrice, holdingCosts }          // creative addition inputs
}
```

### Global (localStorage)

```
globalPrices: { [itemId]: cost }     // standard-pricing rollout across all projects
customItems:  [ { id, name, cost, unit, groupId } ]   // user-added line items
hiddenItems:  Set<itemId>            // user-deleted defaults
```

### Price resolution (one rule satisfies both requirements)

`per-project override → global override → CSV default`

## 6. Cost, progress, and completion rules

- **Line total** = `qty × resolvedCost`, with any per-item `min` applied. Unchecked or qty ≤ 0 → 0.
- **Room subtotal** = sum of its line totals. **Grand total** = sum of room subtotals (always visible).
- **Progress is per group across all rooms.** A group counts complete if any item in it is checked **or** its "No Action Needed" is set. Progress % = complete groups / total groups across every room instance.

## 7. Storage & persistence

- Project state and globals → localStorage, debounced save on mutation, plus save on `visibilitychange`/`pagehide`.
- Photos → IndexedDB as compressed JPEG Blobs (canvas downscale, ~1600px, q≈0.82), keyed by photoId; project references ids only.
- Boot: load globals + most-recent project; if none, create a default project seeded with one each of Interior/General, Systems, Exterior, Kitchen, and Bathroom 1 (agent adds more rooms).

## 8. PWA

- `manifest.webmanifest`: name, short_name, standalone, theme/background colors, icons (192, 512, maskable, apple-touch 180) generated from the Spark logo.
- `sw.js`: on install, precache the app shell (HTML/CSS/JS modules, manifest, icons) **and** the CDN libraries + Tesseract `eng` language data so OCR works offline. Cache-first for assets. Versioned cache name; clean up old caches on activate.

## 9. Creative additions (both, per decision)

1. **Deal / Margin Analyzer (headline creative).** Agent enters ARV, purchase price, optional holding costs; app pulls the live repair total and shows **projected margin, ROI, and max-allowable-offer (70% rule)** with a clear over/under-budget flag. Speaks directly to the acquisition decision the agent is on site to make.
2. **Tesseract.js serial-number OCR (photo "plus").** On a serial-label photo for HVAC / water-heater / appliance items, run OCR offline, parse candidate serial/model and a 4-digit year, let the agent confirm/edit, attach to the item; year flows into the export. Scoped tight to stay within budget.

## 10. Export

- SheetJS workbook (styled): rooms as sections → item name, unit, unit cost, qty, line total; section subtotals; grand total. Optional Deal-summary sheet.
- Photos pulled from IDB into a `/photos` folder with meaningful names (`Room_Group_Item_n.jpg`); serial/OCR text recorded in the workbook or a manifest.
- JSZip bundles workbook + photos; auto-download as a single `.zip`.

## 11. File structure

```
index.html
styles.css
js/
  data.js     — CSV parse + catalog (ITEMS, GROUP_DEFS, ROOM_TYPES)
  store.js    — state, persistence, price resolution, calc/progress
  db.js       — IndexedDB photo storage
  views.js    — rendering + surgical updaters
  export.js   — Excel + ZIP
  ocr.js      — Tesseract integration
  deal.js     — margin analyzer
  app.js      — boot + event delegation
sw.js
manifest.webmanifest
icons/        — 192 / 512 / maskable / apple-touch-180 (from Spark logo)
vendor/       — cached CDN libs + Tesseract eng data (for guaranteed offline)
README.md
```

## 12. Testing & verification

- A small plain-JS unit-test file for pure logic where silent money bugs hide: CSV parse, price resolution, line/group/room totals, progress.
- Manual verification on **real Android Chrome and iOS Safari** before submit: install-to-home-screen, offline reload, photo capture, OCR, export. (The brief weights mobile UX/PWA heavily and triages on them.)

## 13. Out of scope (YAGNI)

- No backend, no auth, no cloud sync.
- No multi-user / sharing beyond the ZIP export.
- No map view, contractor list, or other creative ideas beyond the two chosen.

## 14. Deliverables

1. The static-file app (hosted on GitHub Pages).
2. GitHub repo + README (approach, libraries, how to run locally).
3. One-page PDF: most interesting design/UX decision; what's fragile; creative addition + why; what we'd ship in 2 more days; role of AI tools.
Email to James@sparkequitygroup.com with hosted URL + GitHub link + PDF.

## 15. Rubric mapping

- **Mobile UX 30%** — hand-CSS design system, surgical updates (no jank), drill-down nav, large touch targets.
- **Completeness 25%** — 19 groups + 7 room types, dynamic rooms, photos, export, per-project + global pricing, add/remove items.
- **Code Quality 20%** — focused ES modules, clear data model, original architecture, small test suite.
- **PWA & Offline 15%** — real manifest + service worker precaching app shell, libs, and OCR data.
- **Creative 10%** — Deal Analyzer (headline) + OCR (photo plus).
