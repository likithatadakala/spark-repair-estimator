# Spark Repair Estimator — One-Page Writeup

**Likitha Tadakala**

## Most interesting design / UX decision

Two decisions define the build. First, **a generic room engine instead of fixed sections.** Every flip is a different house, so rooms are dynamic instances of seven configurable types; the screen is a drill-down (project → room → groups) rather than the reference's fixed horizontal tabs, which fall apart the moment an agent adds four bedrooms. Second, and the one I'm most pleased with: **surgical DOM updates on the quantity hot path.** Typing a quantity recomputes the line total, its group subtotal, the room subtotal, the project grand total, and the progress bar — but it rewrites only those few text nodes, never re-rendering the list. On a phone in a real house that is the difference between an input that holds focus and feels instant and one that drops the keyboard and jumps the scroll on every keystroke. Taps that change structure (checking an item, expanding a group) do re-render, but they preserve scroll position. Mobile feel was the thing I optimized for.

## What is fragile or incomplete

- **OCR quality is photo-dependent.** Tesseract reads a clean, straight data plate well and a greasy, angled one poorly. I mitigated this by always showing the parsed serial/year in an editable field before saving, but I did not add image pre-processing (deskew, threshold), which would meaningfully improve hit rate.
- **OCR and export libraries load from a CDN on first use.** The core estimator is fully offline immediately, but the first OCR scan and first export must happen online so the service worker can cache those libraries; afterwards they work offline. I chose lazy CDN loading to keep initial load fast over vendoring ~15 MB of Tesseract assets into the shell.
- **Storage is device-local.** Photos live in IndexedDB and project state in localStorage. There is no cloud backup or cross-device sync, and iOS can evict storage for an uninstalled PWA after several idle days.
- **UI is verified manually, not by automated browser tests.** The financial core (pricing, totals, progress, deal math, export rows, OCR parsing) is unit-tested with Node's test runner, but there are no Playwright/e2e tests for the rendering layer.

## Creative addition and why

I built **two**. The headline is a **Deal / Margin Analyzer**: the agent enters ARV, purchase price, and optional holding costs, and the app shows projected margin, ROI, and the 70%-rule maximum allowable offer (70% of ARV minus repairs) with a clear over/under-budget badge — repairs pulled live from the estimate they just built. That is the actual decision an acquisition agent is standing in the house to make, so it turns the tool from a calculator into a go/no-go aid. The second is **in-browser serial-number OCR** (Tesseract.js): the brief calls serial parsing "a significant plus," and it plays to my computer-vision background, so photographing an HVAC or water-heater data plate auto-fills a candidate serial and manufacture year (which feed the export). It runs entirely client-side, consistent with the offline requirement.

## What I would ship with two more days

- **Comparable / ARV assist** so the analyzer's ARV input isn't a blind guess.
- **Cloud sync and shareable estimates** (the one thing device-local storage gives up).
- **OCR image pre-processing** (deskew + adaptive threshold) and batch scanning of multiple plates.
- **A branded PDF estimate** alongside the Excel, ready to hand to a seller.
- **Undo / change history** on edits, and a lightweight Playwright smoke test for the core flows.

## Role of AI tools

I built this with **Claude Code** using a deliberately structured workflow rather than ad-hoc prompting: a guided brainstorm to lock the architecture, a written design spec, a task-by-task implementation plan, and then subagent-driven execution where each task was implemented and independently reviewed against the spec under test-driven development. I made the architectural calls — the room engine, surgical rendering, IndexedDB for photos, lazy-loaded libraries, the two creative features — and reviewed and corrected the generated code at each step (catalog/pricing consistency, escaping, offline behavior, edge cases). AI accelerated the implementation substantially; the design judgment and the review discipline were mine.
