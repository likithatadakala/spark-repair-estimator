# Spark Homes Repair Estimator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, offline-capable PWA repair-cost estimator for Spark Homes acquisition agents, delivered as a small set of static files hosted on GitHub Pages.

**Architecture:** Vanilla JS ES modules, no framework, no build step. Pure-logic modules (catalog, pricing, calc, progress) are browser-free and unit-tested with Node's built-in test runner. A thin view layer uses event delegation at the app root and surgical DOM updates on the hot path (no full re-renders). Project state persists to localStorage; photos persist to IndexedDB as Blobs. A real service worker precaches the app shell, CDN libraries, and Tesseract OCR data for full offline use.

**Tech Stack:** Vanilla JS (ES modules), hand-authored CSS (CSS custom properties), localStorage, IndexedDB, SheetJS (`xlsx-js-style`), JSZip, Tesseract.js, service worker + web app manifest. Tests: `node --test` (`node:test` + `node:assert`, zero dependencies).

**Reference inputs (in repo root):** `Pricing List.csv`, `Spark Group - Logo.png`, `Contest Briefing.docx`, `Example App.html` (scope reference only — do not copy).

---

## Conventions

- **Commits:** Conventional Commits, imperative, lowercase. End every commit body with the Co-Authored-By trailer the harness requires.
- **Branching:** Work on `main` is fine for this solo repo until the GitHub deliverable; the repo is initialized in Task 0.
- **Pricing rule (hard):** The CSV is the single source of truth for default prices. Never invent prices. Closet/Lighting groups map to existing CSV items; users add anything else via the add-item feature.
- **Pure vs. impure:** `data.js` and the calc/pricing/progress functions in `store.js` must not touch `window`, `localStorage`, `IndexedDB`, or the DOM, so they run under `node --test`. Persistence and rendering live in separate functions/modules.

---

## File Structure

```
package.json                 — {"type":"module"} only; no dependencies
index.html                   — app shell, <script type="module" src="js/app.js">
styles.css                   — design system + components
js/
  data.js      — embedded CSV string, parseCSV(), buildCatalog() → ITEMS, GROUP_DEFS, ROOM_TYPES
  store.js     — state shape, resolveCost(), calcLine/Room/Grand(), progress(), localStorage persistence
  db.js        — IndexedDB promise wrapper for photo Blobs
  views.js     — render functions + surgical updaters
  export.js    — SheetJS workbook + JSZip packaging
  ocr.js       — Tesseract.js serial/year parsing
  deal.js      — margin / ROI / max-offer math
  app.js       — boot + delegated event handlers
sw.js                        — service worker (precache shell + libs + OCR data)
manifest.webmanifest         — PWA manifest
icons/                       — icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-180.png
vendor/                      — pinned copies of CDN libs + tesseract eng.traineddata (for guaranteed offline)
tests/
  data.test.js               — CSV parse + catalog
  store.test.js              — pricing, calc, progress
  deal.test.js               — analyzer math
README.md
docs/superpowers/...         — spec + this plan
```

---

## Task 0: Project setup

**Files:**
- Create: `package.json`, `.gitignore`, `index.html`, `styles.css`, `js/app.js`, `README.md`

- [ ] **Step 1: Initialize git and package.json**

```bash
cd "/Users/likithatadakala/Documents/Project_Submission"
git init
printf '%s\n' 'node_modules' '.DS_Store' '*.log' > .gitignore
```

Create `package.json`:

```json
{
  "name": "spark-repair-estimator",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test",
    "serve": "python3 -m http.server 8080"
  }
}
```

- [ ] **Step 2: Create the app shell `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Spark Estimator" />
  <meta name="theme-color" content="#111827" />
  <title>Spark Repair Estimator</title>
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="apple-touch-icon" href="icons/apple-touch-180.png" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `styles.css` design-system base**

Define CSS custom properties and resets. Minimum:

```css
:root{
  --orange:#c4441e; --orange-600:#a83817; --ink:#111827; --ink-2:#1f2937;
  --bg:#f1f5f9; --card:#ffffff; --line:#e5e7eb; --muted:#6b7280; --muted-2:#9ca3af;
  --ok:#16a34a; --danger:#dc2626; --radius:16px; --tap:44px;
  --pad: max(16px, env(safe-area-inset-left));
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:var(--bg);overscroll-behavior:none;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--ink)}
button{font:inherit;cursor:pointer;border:none;background:none}
input{font:inherit}
.safe-bottom{padding-bottom:max(12px,env(safe-area-inset-bottom))}
.pt-safe{padding-top:max(8px,env(safe-area-inset-top))}
```

Component classes (`.btn`, `.btn-primary`, `.card`, `.field`, `.sheet`, `.row`, etc.) are added as views are built in later tasks; keep them in this file.

- [ ] **Step 4: Create placeholder `js/app.js`**

```js
const app = document.getElementById('app');
app.textContent = 'Spark Repair Estimator — booting…';
```

- [ ] **Step 5: Verify it serves**

Run: `python3 -m http.server 8080` then open `http://localhost:8080`.
Expected: page shows "Spark Repair Estimator — booting…".

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold static app shell and tooling"
```

---

## Task 1: Catalog data layer (`js/data.js`)

Parse the provided CSV into an item map, define the 19 groups + Closet/Lighting mappings, and define the 7 room types. Pure module — no browser APIs.

**Files:**
- Create: `js/data.js`, `tests/data.test.js`

- [ ] **Step 1: Write the failing test `tests/data.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, ITEMS, GROUP_DEFS, ROOM_TYPES } from '../js/data.js';

test('parseCSV handles quoted fields and commas', () => {
  const rows = parseCSV('id,name,cost,unit\nig-08,"Drywall Repair",900.00,"1,000 sqft"');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Drywall Repair');
  assert.equal(rows[0].unit, '1,000 sqft');
  assert.equal(rows[0].cost, '900.00');
});

test('ITEMS contains parsed CSV items with numeric cost', () => {
  assert.ok(ITEMS['ig-01'], 'ig-01 exists');
  assert.equal(typeof ITEMS['ig-01'].cost, 'number');
  assert.equal(ITEMS['ig-05'].name, 'Vinyl Plank');
});

test('there are 7 room types with the brief-specified groups', () => {
  assert.equal(Object.keys(ROOM_TYPES).length, 7);
  assert.deepEqual(ROOM_TYPES.bedroom.groups, ['flooring','paint','doors','closet']);
  assert.deepEqual(ROOM_TYPES.living.groups, ['flooring','paint','doors','lighting']);
  assert.deepEqual(ROOM_TYPES.bathroom.groups, ['vanity','tub','tile']);
});

test('every group definition references only known item ids', () => {
  for (const [gid, ids] of Object.entries(GROUP_DEFS)) {
    for (const id of ids) assert.ok(ITEMS[id], `${gid} references unknown ${id}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/data.test.js`
Expected: FAIL (cannot find module `../js/data.js`).

- [ ] **Step 3: Implement `js/data.js`**

Embed the CSV. Copy the full contents of `Pricing List.csv` (108 data rows) verbatim into the `CSV` template literal below (header line + every row). Then:

```js
// Paste the entire Pricing List.csv contents between the backticks (header + 108 rows).
const CSV = `id,name,cost,unit
ig-01,"Refinish Hardwood Floor",2.35,"sqft"
/* …all remaining rows from Pricing List.csv… */
ex-23,"Garage Conversion",8850.00,"ea."`;

export function parseCSV(text){
  const parseLine = (line) => {
    const out=[]; let cur=''; let q=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'){ if(q && line[i+1]==='"'){cur+='"';i++;} else q=!q; }
      else if(c===',' && !q){ out.push(cur.trim()); cur=''; }
      else cur+=c;
    }
    out.push(cur.trim()); return out;
  };
  const lines=text.trim().split(/\r?\n/);
  const headers=parseLine(lines[0]);
  return lines.slice(1).filter(l=>l.trim()).map(line=>{
    const v=parseLine(line);
    return Object.fromEntries(headers.map((h,i)=>[h.trim(), v[i]??'']));
  });
}

// Item ids that need a serial-number photo + year (used by OCR + export).
const SERIAL_ITEMS = new Set(['as-01','as-02','as-08']);

function buildItems(){
  const map={};
  for(const r of parseCSV(CSV)){
    map[r.id]={ id:r.id, name:r.name, cost:parseFloat(r.cost)||0, unit:r.unit,
      serial: SERIAL_ITEMS.has(r.id) };
  }
  return map;
}
export const ITEMS = buildItems();

// 19 official groups + closet/lighting mapped to existing CSV items (no invented prices).
export const GROUP_DEFS = {
  flooring:  ['ig-01','ig-02','ig-03','ig-04','ig-05','ig-06'],
  paint:     ['ig-07','ig-08','ig-09'],
  doors:     ['ig-10','ig-11','ig-12','ig-13','ig-14','ig-15','ig-16','ig-17','ig-18'],
  pest:      ['ig-23','ig-24'],
  cabinets:  ['kt-01','kt-02','kt-03','kt-04','kt-05'],
  counters:  ['kt-06','kt-07','kt-08','kt-09','kt-10'],
  appliances:['kt-11','kt-12','kt-13','kt-14','kt-15','kt-16','kt-17'],
  vanity:    ['ba-01','ba-02','ba-03','ba-14'],
  tub:       ['ba-07','ba-08','ba-09','ba-10','ba-11','ba-12','ba-13'],
  tile:      ['ba-05','ba-06'],
  hvac:      ['as-01','as-02','as-03','as-04','as-05','as-06','as-07'],
  electrical:['as-10','as-11','as-18','as-19','as-20','as-24'],
  structural:['as-12','as-13','as-14','as-15'],
  insulation:['as-21','as-22','as-23'],
  fence:     ['ex-01','ex-02','ex-03'],
  siding:    ['ex-05','ex-09'],
  windows:   ['ex-13','ex-14','ex-15','ex-16','ex-17'],
  garage:    ['ex-21','ex-22','ex-23'],
  trees:     ['ex-10','ex-11','ex-12'],
  // Decoupled room groups — mapped to existing CSV items.
  closet:    ['ig-12','ig-11'],            // bifold door + door hardware
  lighting:  ['ig-22','as-10'],            // light fixtures + switches/outlets
};

export const GROUP_LABELS = {
  flooring:'Flooring', paint:'Paint & Wall Repair', doors:'Doors', pest:'Pest Control',
  cabinets:'Cabinets', counters:'Countertops & Tile', appliances:'Appliances',
  vanity:'Vanity & Countertop', tub:'Tub & Shower', tile:'Tile',
  hvac:'HVAC', electrical:'Electrical', structural:'Structural', insulation:'Insulation & Drywall',
  fence:'Fence', siding:'Siding', windows:'Windows', garage:'Garage', trees:'Trees',
  closet:'Closet', lighting:'Lighting',
};

export const ROOM_TYPES = {
  interior: { label:'Interior / General', groups:['flooring','paint','doors','pest'], singleton:true },
  kitchen:  { label:'Kitchen', groups:['cabinets','counters','appliances'], singleton:true },
  bathroom: { label:'Bathroom', groups:['vanity','tub','tile'], singleton:false },
  systems:  { label:'Systems & Structure', groups:['hvac','electrical','structural','insulation'], singleton:true },
  exterior: { label:'Exterior', groups:['fence','siding','windows','garage','trees'], singleton:true },
  bedroom:  { label:'Bedroom', groups:['flooring','paint','doors','closet'], singleton:false },
  living:   { label:'Living / Common Area', groups:['flooring','paint','doors','lighting'], singleton:false },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/data.test.js`
Expected: PASS (4 tests). If "unknown item id" fails, fix the GROUP_DEFS id.

- [ ] **Step 5: Commit**

```bash
git add js/data.js tests/data.test.js
git commit -m "feat: add catalog data layer with CSV parser, groups, room types"
```

---

## Task 2: Store — pricing, calculation, progress (`js/store.js`)

Pure functions over an explicit state object plus catalog overrides. No browser APIs in these functions.

**Files:**
- Create: `js/store.js`, `tests/store.test.js`

- [ ] **Step 1: Write the failing test `tests/store.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCost, calcLine, calcRoom, calcGrand, progress } from '../js/store.js';
import { ITEMS, ROOM_TYPES } from '../js/data.js';

const overrides = { project:{}, global:{} };

test('resolveCost prefers project, then global, then catalog', () => {
  assert.equal(resolveCost('ig-01', {project:{}, global:{}}), ITEMS['ig-01'].cost);
  assert.equal(resolveCost('ig-01', {project:{}, global:{'ig-01':9}}), 9);
  assert.equal(resolveCost('ig-01', {project:{'ig-01':4}, global:{'ig-01':9}}), 4);
});

test('calcLine is qty*cost, zero when unchecked or qty<=0', () => {
  assert.equal(calcLine('ig-05', {checked:true, qty:'10'}, overrides), 25);
  assert.equal(calcLine('ig-05', {checked:false, qty:'10'}, overrides), 0);
  assert.equal(calcLine('ig-05', {checked:true, qty:'0'}, overrides), 0);
});

test('calcRoom sums checked lines for a room instance', () => {
  const sel = { 'ig-05':{checked:true, qty:'10'}, 'ig-06':{checked:true, qty:'10'} };
  // vinyl 2.5*10=25 + carpet 1.9*10=19 = 44 (only items in the room's groups count)
  assert.equal(calcRoom('interior', sel, overrides), 44);
});

test('progress counts a group complete when any item checked OR noAction set', () => {
  const project = {
    rooms:[{instanceId:'r1', typeId:'bedroom'}],
    selections:{ r1:{ 'ig-01':{checked:true, qty:'5'} } },
    noAction:{ r1:{ paint:true } },
  };
  // bedroom has 4 groups; flooring done (item), paint done (noAction) => 2/4
  const p = progress(project, overrides);
  assert.equal(p.total, 4);
  assert.equal(p.done, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/store.test.js`
Expected: FAIL (cannot find module `../js/store.js`).

- [ ] **Step 3: Implement the pure functions in `js/store.js`**

```js
import { ITEMS, GROUP_DEFS, ROOM_TYPES } from './data.js';

// overrides = { project:{itemId:cost}, global:{itemId:cost} }
export function resolveCost(itemId, overrides){
  if (overrides.project && itemId in overrides.project) return overrides.project[itemId];
  if (overrides.global  && itemId in overrides.global)  return overrides.global[itemId];
  return ITEMS[itemId]?.cost ?? 0;
}

export function calcLine(itemId, sel, overrides){
  if (!sel || !sel.checked) return 0;
  const q = parseFloat(sel.qty);
  if (!q || q <= 0) return 0;
  return q * resolveCost(itemId, overrides);
}

function roomItemIds(typeId){
  return ROOM_TYPES[typeId].groups.flatMap(g => GROUP_DEFS[g]);
}

export function calcRoom(typeId, selections, overrides){
  return roomItemIds(typeId).reduce((t,id)=> t + calcLine(id, selections?.[id], overrides), 0);
}

export function calcGrand(project, overrides){
  return (project.rooms||[]).reduce((t,r)=>
    t + calcRoom(r.typeId, project.selections?.[r.instanceId], overrides), 0);
}

export function progress(project, overrides){
  let total=0, done=0;
  for (const r of project.rooms||[]){
    for (const g of ROOM_TYPES[r.typeId].groups){
      total++;
      const na = project.noAction?.[r.instanceId]?.[g];
      const anyChecked = GROUP_DEFS[g].some(id => project.selections?.[r.instanceId]?.[id]?.checked);
      if (na || anyChecked) done++;
    }
  }
  return { total, done, pct: total ? Math.round(done/total*100) : 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/store.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add js/store.js tests/store.test.js
git commit -m "feat: add pricing, calculation, and progress logic with tests"
```

---

## Task 3: Persistence layer (`js/store.js` additions)

Add localStorage-backed state management. These functions are impure (touch localStorage) and are verified manually, not in node tests.

**Files:**
- Modify: `js/store.js`

- [ ] **Step 1: Append persistence + state to `js/store.js`**

```js
const LS_PROJECTS = 'spark_projects_v1';
const LS_GLOBAL   = 'spark_global_prices_v1';
const LS_CATALOG  = 'spark_catalog_edits_v1'; // {customItems:[], hiddenItems:[]}
const LS_ACTIVE   = 'spark_active_project_v1';

export const state = {
  projects: [],          // [{id,name,notes,createdAt,updatedAt,rooms,selections,noAction,photoRefs,priceOverrides,deal}]
  activeId: null,
  globalPrices: {},
  catalogEdits: { customItems: [], hiddenItems: [] },
};

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('persist failed', k, e); } };

export function loadAll(){
  state.projects = read(LS_PROJECTS, []);
  state.globalPrices = read(LS_GLOBAL, {});
  state.catalogEdits = read(LS_CATALOG, { customItems: [], hiddenItems: [] });
  state.activeId = read(LS_ACTIVE, null);
}

export function activeProject(){ return state.projects.find(p => p.id === state.activeId) || null; }
export function overridesFor(project){ return { project: project?.priceOverrides || {}, global: state.globalPrices }; }

let timer;
export function persist(){
  clearTimeout(timer);
  timer = setTimeout(() => {
    write(LS_PROJECTS, state.projects);
    write(LS_GLOBAL, state.globalPrices);
    write(LS_CATALOG, state.catalogEdits);
    write(LS_ACTIVE, state.activeId);
  }, 400);
}
export function persistNow(){ write(LS_PROJECTS, state.projects); write(LS_GLOBAL, state.globalPrices);
  write(LS_CATALOG, state.catalogEdits); write(LS_ACTIVE, state.activeId); }

let _seq = 0;
export function uid(prefix='id'){ _seq++; return `${prefix}_${Date.now().toString(36)}_${_seq}`; }

export function newProject(name){
  const id = uid('proj');
  const seed = ['interior','kitchen','systems','exterior','bathroom'];
  const rooms = seed.map((typeId,i)=>({ instanceId: uid('rm'), typeId,
    label: typeId==='bathroom' ? 'Bathroom 1' : null }));
  const p = { id, name: name||'New Estimate', notes:'', createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString(), rooms, selections:{}, noAction:{}, photoRefs:{},
    priceOverrides:{}, deal:{arv:'',purchasePrice:'',holdingCosts:''} };
  state.projects.unshift(p); state.activeId = id; persist(); return p;
}
```

- [ ] **Step 2: Manual verification**

In the browser console after wiring boot (Task 8), confirm `loadAll()`, `newProject('123 Main')`, reload, and `activeProject()` round-trips. (No automated test — localStorage is browser-only.)

- [ ] **Step 3: Commit**

```bash
git add js/store.js
git commit -m "feat: add localStorage persistence and project lifecycle"
```

---

## Task 4: IndexedDB photo store (`js/db.js`)

**Files:**
- Create: `js/db.js`

- [ ] **Step 1: Implement `js/db.js`**

```js
const DB='spark_photos', STORE='photos', VER=1;
function open(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB,VER);
    r.onupgradeneeded=()=>{ const db=r.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  });
}
async function tx(mode){ const db=await open(); return db.transaction(STORE,mode).objectStore(STORE); }

export async function putPhoto(id, blob){ const s=await tx('readwrite');
  return new Promise((res,rej)=>{ const r=s.put(blob,id); r.onsuccess=()=>res(id); r.onerror=()=>rej(r.error); }); }
export async function getPhoto(id){ const s=await tx('readonly');
  return new Promise((res,rej)=>{ const r=s.get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
export async function delPhoto(id){ const s=await tx('readwrite');
  return new Promise((res,rej)=>{ const r=s.delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }

// Downscale a File to a compressed JPEG Blob before storage.
export function compress(file, maxDim=1600, quality=0.82){
  return new Promise(resolve=>{
    const reader=new FileReader();
    reader.onload=e=>{ const img=new Image();
      img.onload=()=>{ const ratio=Math.min(maxDim/img.width, maxDim/img.height, 1);
        const c=document.createElement('canvas'); c.width=Math.round(img.width*ratio); c.height=Math.round(img.height*ratio);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        c.toBlob(b=>resolve(b),'image/jpeg',quality); };
      img.src=e.target.result; };
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 2: Manual verification** — covered when photo capture lands in Task 9.

- [ ] **Step 3: Commit**

```bash
git add js/db.js
git commit -m "feat: add IndexedDB photo storage with client-side compression"
```

---

## Task 5: View layer — project screen + room list (`js/views.js`, `js/app.js`)

Render the project screen: header with running total + progress, room cards, action bar. Use event delegation; no inline handlers.

**Files:**
- Create: `js/views.js`
- Modify: `js/app.js`, `styles.css`

- [ ] **Step 1: Implement render helpers in `js/views.js`**

Export `fmt(n)` → `'$'+Math.round(n).toLocaleString('en-US')`, and `renderProject(project, overrides)` returning HTML for: a dark header (project name, running total `calcGrand`, progress bar from `progress()`), a scrollable list of room cards (label via `roomLabel(room)`, subtotal `calcRoom`, `done/total` groups), and a bottom action bar with buttons `data-action="add-room"`, `"export"`, `"deal"`, `"settings"`, `"projects"`. Each room card carries `data-action="open-room" data-room="<instanceId>"`. Add a `roomLabel(project, room)` helper that numbers multi-instance rooms ("Bathroom 1", "Bedroom 2") by their order among same-type rooms.

- [ ] **Step 2: Add component CSS to `styles.css`**

Add `.header`, `.total`, `.progress`, `.progress > i`, `.room-card`, `.actionbar`, `.btn`, `.btn-primary`, `.fab` styles. Touch targets ≥ `var(--tap)`. Header uses `--ink`; accents use `--orange`.

- [ ] **Step 3: Wire boot + delegation in `js/app.js`**

```js
import { loadAll, state, activeProject, newProject, overridesFor, persistNow } from './store.js';
import { renderProject } from './views.js';

const app = document.getElementById('app');
function render(){
  const p = activeProject();
  app.innerHTML = renderProject(p, overridesFor(p));
}
loadAll();
if (!activeProject()) newProject('New Estimate');
render();

app.addEventListener('click', e=>{
  const el = e.target.closest('[data-action]'); if(!el) return;
  const a = el.dataset.action;
  if (a==='open-room'){ /* set view → room detail (Task 6) */ }
  // add-room/export/deal/settings/projects handled in later tasks
});
window.addEventListener('pagehide', persistNow);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) persistNow(); });
```

- [ ] **Step 4: Manual verification**

Serve, load: project screen shows $0 total, 0% progress, 5 seed room cards (Interior/General, Kitchen, Systems & Structure, Exterior, Bathroom 1), and the action bar. Tabbing/clicking cards logs intent.

- [ ] **Step 5: Commit**

```bash
git add js/views.js js/app.js styles.css
git commit -m "feat: add project screen with room list, running total, progress"
```

---

## Task 6: Room detail — groups, line items, quantity, surgical updates

Render a room's collapsible groups; each group shows its items, a "No Action Needed" toggle, per-item checkbox + qty + line total. Typing a qty updates only the affected totals.

**Files:**
- Modify: `js/views.js`, `js/app.js`, `styles.css`

- [ ] **Step 1: Add `renderRoom(project, room, overrides)` to `js/views.js`**

For each group in `ROOM_TYPES[room.typeId].groups`: a collapsible card titled `GROUP_LABELS[g]` with the group subtotal; a "No Action Needed" toggle bound to `project.noAction[instanceId][g]`; and each item from `GROUP_DEFS[g]` (skipping `hiddenItems`) plus any `customItems` for that group. Each item row: checkbox (`data-action="toggle" data-room data-item`), name, unit-cost label `$cost / unit`, qty input shown when checked (`data-action="qty"`), and a per-line total cell tagged `data-line="<room>:<item>"`. Group subtotal cell tagged `data-group="<room>:<g>"`. Add a back button (`data-action="back"`). Items flagged `serial` render an extra "Scan serial" affordance (wired in Task 10).

- [ ] **Step 2: Implement surgical updaters in `js/views.js`**

Export `updateAfterChange(project, room, itemId, overrides)` that recomputes and writes textContent for: the line cell `[data-line]`, the group cell `[data-group]`, the header total `[data-total]`, and the progress bar `[data-progress]` + `[data-progress-bar]` width — without re-rendering the list.

- [ ] **Step 3: Wire room view + events in `js/app.js`**

Add a `view` variable (`'project'` | `{room:instanceId}`). `render()` branches to `renderRoom` when in a room. Handle: `back` → project view; `toggle` → flip `selections[room][item].checked` (clear qty when unchecked), re-render the single row or room, focus qty; `qty` (on `input` event) → set qty, call `updateAfterChange`, `persist()`; `toggle-group` → expand/collapse (store expanded set in memory); `noaction` → flip `noAction[room][g]`, `updateAfterChange`, re-render group.

- [ ] **Step 4: Add CSS** for `.group`, `.group-head`, `.item-row`, `.checkbox`, `.qty`, `.noaction`. Qty input: `inputmode="decimal"`, right-aligned, ≥44px tall.

- [ ] **Step 5: Manual verification**

Open a room, expand a group, check an item → qty field appears and focuses; type qty → line, group, header totals and progress bar all update with no scroll jump or focus loss; toggle "No Action Needed" → group marked complete in progress.

- [ ] **Step 6: Commit**

```bash
git add js/views.js js/app.js styles.css
git commit -m "feat: add room detail with groups, quantities, surgical total updates"
```

---

## Task 7: Add/remove rooms + project management

**Files:**
- Modify: `js/app.js`, `js/views.js`, `js/store.js`, `styles.css`

- [ ] **Step 1: Add room mutators to `js/store.js`**

```js
import { ROOM_TYPES } from './data.js';
export function addRoom(project, typeId){
  project.rooms.push({ instanceId: uid('rm'), typeId, label:null });
  project.updatedAt = new Date().toISOString(); persist();
}
export function removeRoom(project, instanceId){
  project.rooms = project.rooms.filter(r=>r.instanceId!==instanceId);
  delete project.selections[instanceId]; delete project.noAction[instanceId];
  delete project.photoRefs[instanceId]; persist();
}
```

- [ ] **Step 2: Add-room sheet in `js/views.js`** — a bottom sheet listing room types. Singleton types already present are disabled; multi types always available. Buttons carry `data-action="create-room" data-type="<typeId>"`.

- [ ] **Step 3: Project switcher sheet** — list `state.projects` (name, date, active marker) with `data-action="switch-project"`, plus New / Rename / Delete (`data-action="new-project" / "rename-project" / "delete-project"`). Deleting the active project falls back to the next or creates a fresh one.

- [ ] **Step 4: Wire actions in `js/app.js`** for add-room/create-room/remove-room and the project switcher; re-render after each; `persist()`.

- [ ] **Step 5: Manual verification** — add a 2nd and 3rd bathroom and a bedroom (auto-numbered labels); remove one; create/switch/rename/delete projects; reload preserves everything.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add dynamic room add/remove and project management"
```

---

## Task 8: Settings — global pricing, per-project overrides, add/remove items

**Files:**
- Modify: `js/views.js`, `js/app.js`, `js/store.js`

- [ ] **Step 1: Add catalog/price mutators to `js/store.js`**

```js
export function setGlobalPrice(itemId, cost){ if(cost>=0) state.globalPrices[itemId]=cost; persist(); }
export function setProjectPrice(project, itemId, cost){ project.priceOverrides[itemId]=cost; persist(); }
export function resetGlobalPrices(){ state.globalPrices={}; persist(); }
export function applyPriceCSV(rows){ let n=0; for(const r of rows){ const c=parseFloat(r.cost);
  if(r.id && !isNaN(c) && c>=0){ state.globalPrices[r.id.trim()]=c; n++; } } persist(); return n; }
export function addCustomItem({name,cost,unit,groupId}){ const id=uid('cust');
  state.catalogEdits.customItems.push({id,name,cost:parseFloat(cost)||0,unit,groupId}); persist(); return id; }
export function hideItem(itemId){ if(!state.catalogEdits.hiddenItems.includes(itemId)) state.catalogEdits.hiddenItems.push(itemId); persist(); }
```

Update `views.js` group rendering to include `customItems` whose `groupId` matches and to skip `hiddenItems`. Update `data.js` consumers via a helper `itemsForGroup(groupId)` exported from `store.js` that merges defaults (minus hidden) + customs.

- [ ] **Step 2: Settings sheet in `js/views.js`** — sections: (a) Global price schedule: upload CSV (`data-action="price-csv"`, file input) reusing `parseCSV`, status line, reset-to-default; (b) Add custom item form (name/cost/unit/group → `data-action="save-custom-item"`); the per-item delete control lives on each line row in the room view (`data-action="delete-item"`). Per-project unit-cost editing: a small "edit price" pencil on each checked line opens an inline number input bound to `setProjectPrice`.

- [ ] **Step 3: Wire actions in `js/app.js`**; after price changes call the surgical updater or re-render.

- [ ] **Step 4: Manual verification** — upload a modified CSV → totals shift globally; edit one line's price in a project → only that project changes; add a custom "Closet Shelving" item to the closet group; delete a default item → disappears across projects.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add settings with global/per-project pricing and add/remove items"
```

---

## Task 9: Photo capture, thumbnails, removal

**Files:**
- Modify: `js/views.js`, `js/app.js`

- [ ] **Step 1: Photo UI** — in the room view, add a "Photos" strip per room (and per serial item). "Add Photo" triggers a dynamically created `<input type="file" accept="image/*" capture="environment">` appended to the DOM (required for reliable Android capture). On change: `compress(file)` → `putPhoto(uid('ph'), blob)` → push id into `project.photoRefs[key]` → render thumbnail from `URL.createObjectURL(await getPhoto(id))`. Each thumbnail has a remove button (`data-action="remove-photo"`) that calls `delPhoto` and splices the ref.

- [ ] **Step 2: Wire actions in `js/app.js`** for add-photo / remove-photo (async).

- [ ] **Step 3: Revoke object URLs** on re-render to avoid leaks (track created URLs, revoke on view change).

- [ ] **Step 4: Manual verification (Android Chrome real device)** — camera opens, photo appears as thumbnail, persists across reload (from IDB), removes individually.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add camera photo capture, thumbnails, and removal via IndexedDB"
```

---

## Task 10: OCR — Tesseract.js serial/year parsing (`js/ocr.js`)

**Files:**
- Create: `js/ocr.js`
- Modify: `index.html` (load Tesseract from vendor), `js/views.js`, `js/app.js`

- [ ] **Step 1: Vendor Tesseract** — download `tesseract.min.js`, the worker, core wasm, and `eng.traineddata` into `vendor/tesseract/`. Add `<script src="vendor/tesseract/tesseract.min.js"></script>` to `index.html` (classic script; exposes `Tesseract`).

- [ ] **Step 2: Implement `js/ocr.js`**

```js
export async function readSerial(blob){
  const { data } = await Tesseract.recognize(blob, 'eng', {
    workerPath:'vendor/tesseract/worker.min.js',
    corePath:'vendor/tesseract/tesseract-core.wasm.js',
    langPath:'vendor/tesseract/',
  });
  const text = (data.text||'').trim();
  const year = (text.match(/\b(19|20)\d{2}\b/)||[])[0] || '';
  // serial heuristic: longest token with letters+digits
  const serial = (text.split(/\s+/).filter(t=>/[A-Z]/i.test(t)&&/\d/.test(t))
    .sort((a,b)=>b.length-a.length)[0]) || '';
  return { text, serial, year };
}
```

- [ ] **Step 3: UI** — on serial items, a "Scan serial" button takes/uses a photo, shows a spinner, runs `readSerial`, then presents an editable form prefilled with `serial` + `year`. Confirm writes `selections[room][item].year` and a `.serial` note; year shows on the line and in export.

- [ ] **Step 4: Manual verification** — photograph a furnace/water-heater label; OCR returns text; year auto-fills; agent can edit; works offline (disable network after first load).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add offline Tesseract OCR for serial/year capture on systems items"
```

---

## Task 11: Deal / Margin analyzer (`js/deal.js`)

**Files:**
- Create: `js/deal.js`, `tests/deal.test.js`
- Modify: `js/views.js`, `js/app.js`

- [ ] **Step 1: Write failing test `tests/deal.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/deal.js';

test('analyze computes margin, roi, and 70%-rule max offer', () => {
  const r = analyze({ arv:215000, purchasePrice:120000, holdingCosts:0, repairs:38450 });
  assert.equal(r.margin, 215000 - 120000 - 38450);          // 56550
  assert.equal(r.maxOffer, Math.round(0.7*215000 - 38450));  // 112050
  assert.equal(r.overBudget, 120000 > r.maxOffer);           // true
  assert.ok(Math.abs(r.roi - (r.margin/(120000+38450))*100) < 1e-6);
});

test('analyze handles blank inputs as zero', () => {
  const r = analyze({ arv:'', purchasePrice:'', holdingCosts:'', repairs:0 });
  assert.equal(r.margin, 0); assert.equal(r.maxOffer, 0);
});
```

- [ ] **Step 2: Run to verify it fails** — `node --test tests/deal.test.js` → FAIL.

- [ ] **Step 3: Implement `js/deal.js`**

```js
const num = v => { const n=parseFloat(v); return isNaN(n)?0:n; };
export function analyze({arv, purchasePrice, holdingCosts, repairs}){
  const A=num(arv), P=num(purchasePrice), H=num(holdingCosts), R=num(repairs);
  const margin = A - P - R - H;
  const basis = P + R + H;
  const roi = basis>0 ? (margin/basis)*100 : 0;
  const maxOffer = Math.round(0.7*A - R);
  return { margin, roi, maxOffer, overBudget: P>maxOffer, basis };
}
```

- [ ] **Step 4: Run to verify it passes** — `node --test tests/deal.test.js` → PASS.

- [ ] **Step 5: UI** — a Deal Analyzer sheet: inputs ARV / purchase price / holding costs (bound to `project.deal`), repairs auto-filled from `calcGrand`, and a result panel showing margin, ROI %, max offer, and an over/under-budget badge. Recompute on input.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add deal analyzer with margin, ROI, and max-offer logic and tests"
```

---

## Task 12: Export — Excel + ZIP (`js/export.js`)

**Files:**
- Create: `js/export.js`
- Modify: `index.html` (vendor SheetJS + JSZip), `js/app.js`

- [ ] **Step 1: Vendor libs** — copy `xlsx.bundle.js` (xlsx-js-style) and `jszip.min.js` into `vendor/` and add classic `<script>` tags in `index.html`.

- [ ] **Step 2: Implement `js/export.js`**

`exportProject(project, overrides)`:
1. Build a worksheet: title row (Spark Equity Group — Repair Estimate, property name, date); per room a section header + column headers (Repair Item, Unit, Unit Cost, Qty, Estimate); a row per checked item with qty>0 (include year for serial items); section subtotal; then a grand-total row. Use `XLSX.utils` cell/merge styling like a clean branded sheet (header fills in `--ink`/`--orange` hex).
2. Optionally add a "Deal" sheet from `analyze(...)` if deal inputs present.
3. Collect photos: for each `photoRefs` key, `getPhoto(id)` → add to JSZip under `photos/<Room>_<Group>_<Item>_<n>.jpg`.
4. If photos exist, zip workbook (`XLSX.write(wb,{type:'array'})`) + photos and download `.zip`; else download `.xlsx` directly.
5. Filename: `Spark-Estimate-<projectName>-<YYYY-MM-DD>`.

- [ ] **Step 3: Wire `export` action** in `js/app.js` (show a brief "Preparing…" state while async).

- [ ] **Step 4: Manual verification** — export a project with items + photos; ZIP downloads; open xlsx (totals match the app), photos present and named sensibly.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add styled Excel export bundled with photos as ZIP"
```

---

## Task 13: PWA — manifest, icons, service worker

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icons/*`
- Modify: `index.html`, `js/app.js`

- [ ] **Step 1: Generate icons** from `Spark Group - Logo.png` (orange mark on white or dark). Produce `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (safe-zone padded), `apple-touch-180.png`.

```bash
# Example using sips (macOS) from a square master export of the logo mark:
sips -z 192 192 icons/master.png --out icons/icon-192.png
sips -z 512 512 icons/master.png --out icons/icon-512.png
sips -z 180 180 icons/master.png --out icons/apple-touch-180.png
# maskable: pad the mark to ~80% safe zone in an image editor, export 512.
```

- [ ] **Step 2: Create `manifest.webmanifest`**

```json
{
  "name": "Spark Repair Estimator",
  "short_name": "Estimator",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#111827",
  "theme_color": "#111827",
  "icons": [
    {"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},
    {"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},
    {"src":"icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}
  ]
}
```

- [ ] **Step 3: Create `sw.js`**

```js
const CACHE='spark-v1';
const ASSETS=[
  './','./index.html','./styles.css','./manifest.webmanifest',
  './js/app.js','./js/data.js','./js/store.js','./js/db.js','./js/views.js',
  './js/export.js','./js/ocr.js','./js/deal.js',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-180.png',
  './vendor/xlsx.bundle.js','./vendor/jszip.min.js',
  './vendor/tesseract/tesseract.min.js','./vendor/tesseract/worker.min.js',
  './vendor/tesseract/tesseract-core.wasm.js','./vendor/tesseract/eng.traineddata',
];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=> hit || fetch(e.request).then(res=>{
    const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return res;
  }).catch(()=>hit)));
});
```

- [ ] **Step 4: Register SW in `js/app.js`**

```js
if('serviceWorker' in navigator){ window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.js').catch(console.warn)); }
```

- [ ] **Step 5: Manual verification** — Lighthouse PWA installable; add to home screen on Android + iOS; reload offline (airplane mode) → app + OCR still work; state persists.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add real PWA manifest, icons, and offline service worker"
```

---

## Task 14: Polish, device testing, README, PDF, deploy

**Files:**
- Modify: `styles.css`, various; Create: `README.md`, PDF

- [ ] **Step 1: Mobile UX polish** — loading states (export/OCR spinners), empty states, error toasts (export/photo failures), transitions on sheets/collapses, ≥44px touch targets, tabular-nums on totals, prevent double-tap zoom on controls, confirm-before-delete.

- [ ] **Step 2: Run all tests** — `node --test` → all green. `git commit` any fixes.

- [ ] **Step 3: Real-device matrix** — Chrome Android + Safari iOS: install, offline, photo capture, OCR, export, multi-room, multi-project. Log issues, fix, re-verify.

- [ ] **Step 4: Write `README.md`** — what it is, approach, libraries, how to run locally (`python3 -m http.server 8080`), how tests run (`node --test`), browser support, known limitations.

- [ ] **Step 5: Deploy to GitHub Pages** — create public/shared repo, push, enable Pages on `main`/root, confirm hosted URL works as an installable PWA.

- [ ] **Step 6: One-page PDF writeup** — (1) most interesting design/UX decision (surgical updates + drill-down room engine), (2) what's fragile (OCR accuracy on dirty labels; IDB quota on very large photo sets; no cloud backup), (3) creative addition + why (deal analyzer; OCR plus), (4) what ships next in 2 days, and the role AI tools played.

- [ ] **Step 7: Final commit + tag**

```bash
git add -A
git commit -m "docs: add README and finalize polish for submission"
git tag v1.0.0
```

---

## Self-Review — spec coverage

- Project management (create/switch/rename/delete, isolation) → Tasks 3, 7. ✓
- 75+ items, 19 groups, collapsible, No Action Needed, item meta, per-project + global price override, add/remove items, always-visible total → Tasks 1, 2, 6, 8. ✓
- 7 configurable room types, add/remove instances, instance labels → Tasks 1, 6, 7. ✓
- Progress per group across all rooms → Task 2 (logic) + Tasks 5/6 (display). ✓
- Photo capture (camera, thumbnails, individual removal, Android `capture`) → Task 9. ✓
- Export ZIP (styled Excel + photos, grand total, auto-download) → Task 12. ✓
- Creative: deal analyzer + OCR → Tasks 10, 11. ✓
- PWA + offline (manifest, SW precaching shell+libs+OCR data, installable) → Task 13. ✓
- Pricing from CSV as source of truth; Closet/Lighting from existing items → Task 1. ✓
- Code quality (focused modules, tests on pure logic) → Tasks 1, 2, 11. ✓
- Deliverables (hosted app, repo+README, PDF) → Task 14. ✓

No placeholders; function/property names are consistent across tasks (`resolveCost`, `calcLine`, `calcRoom`, `calcGrand`, `progress`, `overridesFor`, `addRoom`, `removeRoom`, `analyze`, `readSerial`, `putPhoto/getPhoto/delPhoto/compress`, `exportProject`).
