# Spark Repair Estimator

A mobile-first, offline-capable Progressive Web App that lets Spark Homes acquisition agents estimate repair costs while walking a distressed property on their phone. Agents drill into rooms, check off needed repairs, enter quantities, attach photos, and read a live repair total — then export the estimate as a ZIP containing a styled Excel cost breakdown and every photo taken.

Built for the Spark Homes Developer Contest.

## Highlights

- **Dynamic room engine** — 7 configurable room types (Interior/General, Kitchen, Bathroom, Systems & Structure, Exterior, Bedroom, Living/Common). Rooms are added and removed freely during a walkthrough; multi-instance rooms auto-number ("Bathroom 1", "Bedroom 2").
- **75+ line items in 19 collapsible groups**, every group with a "No Action Needed" toggle.
- **Per-project and global price overrides**, plus add/remove line items — the running catalog drives both rendering and totals so they never disagree.
- **Live, jank-free totals** — typing a quantity updates the line, group, room, and project totals plus the progress bar via surgical DOM writes, never a re-render, so the input never loses focus.
- **Camera photo capture** stored as compressed Blobs in IndexedDB (no localStorage quota cliff), attachable to rooms and to specific serial-bearing equipment.
- **Two creative features:**
  - **Deal / Margin Analyzer** — enter ARV, purchase price, and holding costs; see projected margin, ROI, and the 70%-rule maximum allowable offer with an over/under-budget flag, repairs pulled live from the estimate.
  - **Serial-number OCR** — photograph an HVAC / water-heater / appliance data plate and Tesseract.js (in-browser) parses a candidate serial and manufacture year.
- **Real PWA** — installs to the home screen, runs fully offline via a service worker that precaches the app shell and runtime-caches the OCR/export libraries.
- **ZIP export** — a styled `.xlsx` (rooms as sections, line items, subtotals, grand total, optional deal summary) bundled with all photos.

## Tech & approach

Vanilla JavaScript ES modules, hand-authored CSS, no build step and no required server. The financial core (catalog parsing, price resolution, line/room/grand totals, progress, deal math, and the export row builder) is written as pure functions and unit-tested with Node's built-in test runner — zero test dependencies.

| Concern | Choice |
|---|---|
| UI | Vanilla JS, event delegation, surgical DOM updates |
| Styling | Hand-authored CSS with custom properties (no framework) |
| Project state | `localStorage` (debounced writes) |
| Photos | `IndexedDB` (compressed JPEG Blobs) |
| Excel | SheetJS (`xlsx-js-style`), lazy-loaded from CDN |
| ZIP | JSZip, lazy-loaded from CDN |
| OCR | Tesseract.js, lazy-loaded from CDN |
| PWA | Web App Manifest + service worker |

Heavy libraries (Tesseract, SheetJS, JSZip) are lazy-loaded only when first needed, keeping initial load fast; the service worker caches them on first use so they work offline thereafter.

### Module layout

```
index.html              app shell
styles.css              design system + components
js/data.js              CSV catalog → ITEMS, GROUP_DEFS, ROOM_TYPES (pure)
js/store.js             pricing/calc/progress (pure) + state & persistence
js/db.js                IndexedDB photo storage + image compression
js/views.js             pure HTML render functions + surgical updaters
js/ocr.js               serial/year parser (pure) + Tesseract loader
js/deal.js              margin / ROI / max-offer math (pure)
js/export.js            row builder (pure) + Excel/ZIP writer
js/app.js               boot, event delegation, view state
sw.js                   service worker (offline)
manifest.webmanifest    PWA manifest
icons/                  app icons
tests/                  Node unit tests for the pure logic
```

## Run locally

A service worker and ES modules require HTTP (not `file://`), so serve the folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

To install as a PWA, open the served URL in Chrome (Android/desktop) or Safari (iOS) and choose "Add to Home Screen".

## Tests

Pure logic is covered by `node:test` (Node 18+):

```bash
node --test
```

## Browser support

Chrome for Android and Safari for iOS (the field targets), plus modern desktop Chrome/Safari/Edge.

## Known limitations

- OCR accuracy depends on the photo: a clean, straight, well-lit data plate reads far better than a dirty or angled one. The parsed serial/year is always editable before saving.
- OCR and Excel/ZIP export load their libraries from a CDN on first use; that first use must be online (afterwards the service worker serves them offline). The core estimator works offline immediately.
- Data is stored on the device only (localStorage + IndexedDB); there is no cloud backup or cross-device sync.
- iOS may evict storage for a PWA that has not been opened for several days if it was not installed to the home screen.

## License

Prepared as a contest submission for Spark Homes.
