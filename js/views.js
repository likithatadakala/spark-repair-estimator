import { ROOM_TYPES, GROUP_LABELS } from './data.js';
import { calcGrand, calcRoom, calcLine, progress, resolveCost, state,
  getItem, groupItemIds } from './store.js';

// ============================================================
// Inline SVG icon constants (24x24, currentColor, stroke-based)
// ============================================================
const ICON = {
  gear:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  pencil:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  menu:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  chevron:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>',
  plus:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  deal:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  export:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
  back:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  camera:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

// ============================================================
// Helpers
// ============================================================
export function fmt(n) {
  return '$' + Math.round(n || 0).toLocaleString('en-US');
}

// HTML-escape any user-controlled string (project / room names).
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Horizontal, scrollable photo strip. Pure string render — thumbnails carry NO
// src; app.js hydrates them async from IndexedDB after innerHTML is written.
// `key` is either room.instanceId (room-level) or `${instanceId}:${itemId}`
// (serial-item-level). May contain a colon — fine as an attribute value.
export function renderPhotoStrip(project, key) {
  const k = esc(key);
  const entries = project.photoRefs?.[key] || [];
  const thumbs = entries.map((p) => `
      <span class="thumb-wrap">
        <img class="thumb" data-photo-id="${esc(p.id)}" alt="${esc(p.name || 'photo')}">
        <button class="thumb-remove" type="button" data-action="remove-photo" data-key="${k}" data-id="${esc(p.id)}" aria-label="Remove photo">&times;</button>
      </span>`).join('');
  return `
    <div class="photo-strip">
      ${thumbs}
      <button class="thumb-add" type="button" data-action="add-photo" data-key="${k}">${ICON.camera}<span>Add Photo</span></button>
    </div>`;
}

export function roomLabel(project, room) {
  if (room.label) return room.label;
  const type = ROOM_TYPES[room.typeId];
  const base = type?.label ?? room.typeId;
  if (type?.singleton) return base;
  // Multi-instance type: 1-based ordinal among same typeId, in project.rooms order.
  let n = 0;
  for (const r of project.rooms || []) {
    if (r.typeId === room.typeId) {
      n++;
      if (r.instanceId === room.instanceId) break;
    }
  }
  return `${base} ${n}`;
}

// Per-room group completion: a group is "done" if any item is checked OR it is marked no-action.
function roomGroupProgress(project, room) {
  const groups = ROOM_TYPES[room.typeId]?.groups || [];
  const sel = project.selections?.[room.instanceId];
  const na = project.noAction?.[room.instanceId];
  let done = 0;
  for (const g of groups) {
    const noAction = na?.[g];
    const anyChecked = groupItemIds(g).some((id) => sel?.[id]?.checked);
    if (noAction || anyChecked) done++;
  }
  return { done, total: groups.length };
}

// ============================================================
// Project screen
// ============================================================
export function renderProject(project, overrides) {
  const grand = calcGrand(project, overrides);
  const prog = progress(project, overrides);

  const rooms = (project.rooms || []).map((room) => {
    const subtotal = calcRoom(room.typeId, project.selections?.[room.instanceId], overrides);
    const gp = roomGroupProgress(project, room);
    const sub = ROOM_TYPES[room.typeId]?.label ?? room.typeId;
    return `
      <button class="room-card" type="button" data-action="open-room" data-room="${esc(room.instanceId)}">
        <span class="room-main">
          <span class="room-name">${esc(roomLabel(project, room))}</span>
          <span class="room-sub">${esc(sub)} · ${gp.done}/${gp.total} groups</span>
        </span>
        <span class="room-right">
          <span class="room-total money">${subtotal > 0 ? fmt(subtotal) : '—'}</span>
          <span class="room-chevron" aria-hidden="true">${ICON.chevron}</span>
        </span>
      </button>`;
  }).join('');

  return `
  <div class="app">
    <header class="header pt-safe">
      <div class="header-top">
        <span class="brand"><b>SPARK</b> <span class="brand-sep">·</span> REPAIR ESTIMATOR</span>
        <span class="header-actions">
          <button class="icon-btn icon-btn-dark" type="button" data-action="projects" aria-label="Switch project">${ICON.menu}</button>
          <button class="icon-btn icon-btn-dark" type="button" data-action="settings" aria-label="Settings">${ICON.gear}</button>
        </span>
      </div>
      <div class="proj-name-row">
        <h1 class="proj-name">${esc(project.name)}</h1>
        <button class="icon-btn icon-btn-dark proj-rename" type="button" data-action="rename-project" aria-label="Rename project">${ICON.pencil}</button>
      </div>
      <div class="total money" aria-label="Running total">${fmt(grand)}</div>
      <div class="progress-row">
        <div class="progress" role="progressbar" aria-valuenow="${prog.pct}" aria-valuemin="0" aria-valuemax="100">
          <i style="width:${prog.pct}%"></i>
        </div>
        <span class="progress-label">${prog.done}/${prog.total} groups · ${prog.pct}%</span>
      </div>
    </header>

    <main class="rooms" data-scroll>
      <h2 class="section-title">Rooms</h2>
      <div class="room-list">
        ${rooms}
      </div>
    </main>

    <nav class="actionbar safe-bottom" aria-label="Project actions">
      <button class="btn btn-ghost" type="button" data-action="deal">${ICON.deal}<span>Deal</span></button>
      <button class="btn btn-primary" type="button" data-action="add-room">${ICON.plus}<span>Add Room</span></button>
      <button class="btn btn-ghost" type="button" data-action="export">${ICON.export}<span>Export</span></button>
    </nav>
  </div>`;
}

// ============================================================
// Room detail screen
// ============================================================

// Sum of line totals over a group's items for this room.
function groupSubtotal(groupId, sel, overrides) {
  return groupItemIds(groupId).reduce(
    (t, id) => t + calcLine(id, sel?.[id], overrides), 0);
}

// Per-line price approach: when a row is checked, we ALWAYS render a small inline
// "Unit $" number input (data-action="price") prefilled with the resolved unit cost,
// wired to setProjectPrice. A subtle "custom" tag shows when the project overrides it.
// (We chose the always-visible inline input over a pencil toggle — fewer taps, and
//  it keeps the editable cost adjacent to the qty the agent is already adjusting.)
function renderItemRow(room, project, itemId, sel, overrides) {
  const item = getItem(itemId);
  if (!item) return '';
  const cur = sel?.[itemId];
  const checked = !!cur?.checked;
  const line = calcLine(itemId, cur, overrides);
  const unitCost = resolveCost(itemId, overrides);
  const overridden = project.priceOverrides && itemId in project.priceOverrides;
  const rid = esc(room.instanceId);
  const iid = esc(itemId);

  const qtyBlock = checked
    ? `<div class="qty-row">
         <input class="qty" data-action="qty" data-room="${rid}" data-item="${iid}"
                type="number" inputmode="decimal" min="0" step="any"
                value="${esc(cur?.qty ?? '')}" aria-label="Quantity for ${esc(item.name)}">
         <span class="qty-unit">${esc(item.unit)}</span>
       </div>`
    : '';

  const priceBlock = checked
    ? `<div class="price-row">
         <span class="price-label">Unit $</span>
         <input class="price-input" data-action="price" data-room="${rid}" data-item="${iid}"
                type="number" inputmode="decimal" min="0" step="any"
                value="${esc(unitCost)}" aria-label="Unit cost for ${esc(item.name)}">
         <span class="qty-unit">/ ${esc(item.unit)}</span>
         ${overridden ? '<span class="price-custom-tag">custom</span>' : ''}
       </div>`
    : '';

  const serialBlock = item.serial
    ? `<button class="scan-serial" type="button" data-action="scan-serial" data-room="${rid}" data-item="${iid}">
         ${ICON.camera}<span>Scan serial</span>
       </button>
       ${renderPhotoStrip(project, `${room.instanceId}:${itemId}`)}`
    : '';

  return `
    <div class="item-row${checked ? ' is-checked' : ''}">
      <button class="checkbox${checked ? ' is-checked' : ''}" type="button"
              data-action="toggle" data-room="${rid}" data-item="${iid}"
              role="checkbox" aria-checked="${checked}" aria-label="${esc(item.name)}">
        ${checked ? ICON.check : ''}
      </button>
      <div class="item-main">
        <span class="item-name">${esc(item.name)}${overridden ? '<span class="price-dot" aria-hidden="true"></span>' : ''}</span>
        <span class="item-sub">${fmt(unitCost)} / ${esc(item.unit)}</span>
        ${qtyBlock}
        ${priceBlock}
        ${serialBlock}
      </div>
      <span class="line-actions">
        <span class="line-total money${line > 0 ? '' : ' is-zero'}" data-line="${rid}:${iid}">${line > 0 ? fmt(line) : '—'}</span>
        <button class="line-del" type="button" data-action="delete-item" data-room="${rid}" data-item="${iid}" aria-label="Remove ${esc(item.name)}">${ICON.trash}</button>
      </span>
    </div>`;
}

function renderGroup(project, room, groupId, overrides, expanded) {
  const sel = project.selections?.[room.instanceId];
  const na = project.noAction?.[room.instanceId];
  const rid = esc(room.instanceId);
  const gid = esc(groupId);

  const noAction = !!na?.[groupId];
  const anyChecked = groupItemIds(groupId).some((id) => sel?.[id]?.checked);
  const done = noAction || anyChecked;
  const subtotal = groupSubtotal(groupId, sel, overrides);

  const body = expanded
    ? `<div class="group-body">
         <button class="noaction${noAction ? ' is-on' : ''}" type="button"
                 data-action="noaction" data-room="${rid}" data-group="${gid}"
                 role="checkbox" aria-checked="${noAction}">
           <span class="checkbox checkbox-sm${noAction ? ' is-checked' : ''}">${noAction ? ICON.check : ''}</span>
           <span class="noaction-label">No action needed</span>
         </button>
         <div class="item-list${noAction ? ' is-deemphasized' : ''}">
           ${groupItemIds(groupId).map((id) => renderItemRow(room, project, id, sel, overrides)).join('')}
         </div>
       </div>`
    : '';

  return `
    <section class="group${expanded ? ' is-expanded' : ''}">
      <button class="group-head" type="button"
              data-action="toggle-group" data-room="${rid}" data-group="${gid}"
              aria-expanded="${expanded}">
        <span class="group-chevron${expanded ? ' is-open' : ''}" aria-hidden="true">${ICON.chevron}</span>
        <span class="group-title">${esc(GROUP_LABELS[groupId] ?? groupId)}</span>
        ${done ? '<span class="group-badge">Done</span>' : ''}
        <span class="group-total money${subtotal > 0 ? '' : ' is-zero'}" data-grouptotal="${rid}:${gid}">${subtotal > 0 ? fmt(subtotal) : '—'}</span>
      </button>
      ${body}
    </section>`;
}

export function renderRoom(project, room, overrides, expandedGroups) {
  const grand = calcGrand(project, overrides);
  const prog = progress(project, overrides);
  const groups = ROOM_TYPES[room.typeId]?.groups || [];
  const expanded = expandedGroups || new Set();

  const groupsHtml = groups
    .map((g) => renderGroup(project, room, g, overrides, expanded.has(g)))
    .join('');

  return `
  <div class="app">
    <header class="header pt-safe">
      <div class="header-top">
        <button class="icon-btn icon-btn-dark" type="button" data-action="back" aria-label="Back to project">${ICON.back}</button>
        <h1 class="room-title">${esc(roomLabel(project, room))}</h1>
        <button class="icon-btn icon-btn-dark" type="button" data-action="remove-room" data-room="${esc(room.instanceId)}" aria-label="Remove room">${ICON.trash}</button>
      </div>
      <div class="total money" aria-label="Running total" data-total>${fmt(grand)}</div>
      <div class="progress-row">
        <div class="progress" role="progressbar" aria-valuenow="${prog.pct}" aria-valuemin="0" aria-valuemax="100">
          <i data-progress-bar style="width:${prog.pct}%"></i>
        </div>
        <span class="progress-label" data-progress>${prog.done}/${prog.total} groups · ${prog.pct}%</span>
      </div>
    </header>

    <main class="groups" data-scroll>
      <section class="room-photos">
        <h2 class="room-photos-label">Photos</h2>
        ${renderPhotoStrip(project, room.instanceId)}
      </section>
      ${groupsHtml}
    </main>
  </div>`;
}

// ============================================================
// Bottom-sheet layer (reusable) — pure string render.
// ui.sheet is null | {type:'addroom'} | {type:'projects'}
//   | {type:'prompt', mode:'new'|'rename', id?, value?}
// Only the backdrop and explicit close/cancel buttons carry
// data-action="sheet-close". The inner .sheet has NO data-action,
// so clicks inside it never bubble to a close handler.
// ============================================================

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sheetShell(title, bodyHtml) {
  return `
  <div class="sheet-backdrop" data-action="sheet-close">
    <div class="sheet safe-bottom" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-head">
        <h2 class="sheet-title">${esc(title)}</h2>
        <button class="icon-btn sheet-close" type="button" data-action="sheet-close" aria-label="Close">${ICON.close}</button>
      </div>
      <div class="sheet-body">
        ${bodyHtml}
      </div>
    </div>
  </div>`;
}

function addRoomSheet(project) {
  const present = new Set((project.rooms || []).map((r) => r.typeId));
  const rows = Object.keys(ROOM_TYPES).map((typeId) => {
    const type = ROOM_TYPES[typeId];
    const label = esc(type.label);
    if (type.singleton && present.has(typeId)) {
      return `
        <div class="sheet-row is-disabled" aria-disabled="true">
          <span class="sheet-row-main">${label}</span>
          <span class="sheet-tag">Added</span>
        </div>`;
    }
    return `
      <button class="sheet-row" type="button" data-action="create-room" data-type="${esc(typeId)}">
        <span class="sheet-row-main">${label}</span>
        <span class="sheet-row-chevron" aria-hidden="true">${ICON.chevron}</span>
      </button>`;
  }).join('');
  return sheetShell('Add a room', `<div class="sheet-list">${rows}</div>`);
}

function projectsSheet() {
  const rows = (state.projects || []).map((p) => {
    const isActive = p.id === state.activeId;
    const date = shortDate(p.updatedAt || p.createdAt);
    return `
      <div class="sheet-row sheet-row-proj${isActive ? ' is-active' : ''}">
        <button class="sheet-row-main proj-pick" type="button" data-action="switch-project" data-id="${esc(p.id)}">
          <span class="proj-pick-name">${esc(p.name)}${isActive ? '<span class="sheet-badge">Active</span>' : ''}</span>
          ${date ? `<span class="proj-pick-date">${esc(date)}</span>` : ''}
        </button>
        <button class="icon-btn proj-act" type="button" data-action="rename-project" data-id="${esc(p.id)}" aria-label="Rename ${esc(p.name)}">${ICON.pencil}</button>
        <button class="icon-btn proj-act" type="button" data-action="delete-project" data-id="${esc(p.id)}" aria-label="Delete ${esc(p.name)}">${ICON.trash}</button>
      </div>`;
  }).join('');
  const body = `
    <div class="sheet-list">${rows}</div>
    <button class="btn btn-primary sheet-cta" type="button" data-action="new-project">${ICON.plus}<span>New Project</span></button>`;
  return sheetShell('Projects', body);
}

function promptSheet(sheet) {
  const title = sheet.mode === 'rename' ? 'Rename' : 'New Project';
  const val = esc(sheet.value || '');
  const body = `
    <input id="sheet-input" class="sheet-input" type="text"
           value="${val}" placeholder="e.g. 123 Main St"
           autocomplete="off" autocapitalize="words">
    <div class="sheet-actions">
      <button class="btn btn-ghost sheet-btn" type="button" data-action="sheet-close">Cancel</button>
      <button class="btn btn-primary sheet-btn" type="button" data-action="prompt-save">Save</button>
    </div>`;
  return sheetShell(title, body);
}

function settingsSheet() {
  const overrideCount = Object.keys(state.globalPrices || {}).length;
  const hasOverrides = overrideCount > 0;
  const statusLine = hasOverrides
    ? `Custom prices active — ${overrideCount} item${overrideCount === 1 ? '' : 's'}`
    : 'Using default prices';

  const groupOptions = Object.keys(GROUP_LABELS)
    .map((g) => `<option value="${esc(g)}">${esc(GROUP_LABELS[g])}</option>`)
    .join('');

  const body = `
    <section class="settings-section">
      <h3 class="settings-h">Global price schedule</h3>
      <p class="settings-help">Upload a CSV (columns <code>id, cost</code>) to update standard prices across all projects.</p>
      <label class="btn btn-ghost settings-file" data-action="price-csv">
        ${ICON.export}<span>Upload price CSV</span>
        <input type="file" id="price-csv-input" accept=".csv,.CSV" hidden>
      </label>
      <p class="settings-status${hasOverrides ? ' is-active' : ''}">${esc(statusLine)}</p>
      ${hasOverrides ? '<button class="btn btn-ghost settings-reset" type="button" data-action="reset-prices">Reset to default prices</button>' : ''}
    </section>

    <section class="settings-section">
      <h3 class="settings-h">Add a line item</h3>
      <p class="settings-help">Create a custom item; it appears in the chosen group across all projects.</p>
      <div class="ci-form">
        <input id="ci-name" class="ci-field" type="text" placeholder="Item name" autocomplete="off">
        <input id="ci-cost" class="ci-field" type="number" inputmode="decimal" min="0" step="any" placeholder="Cost">
        <input id="ci-unit" class="ci-field" type="text" value="ea." placeholder="Unit" autocomplete="off">
        <select id="ci-group" class="ci-field">${groupOptions}</select>
        <button class="btn btn-primary ci-save" type="button" data-action="save-custom-item">${ICON.plus}<span>Add item</span></button>
      </div>
    </section>`;
  return sheetShell('Settings & Pricing', body);
}

export function renderSheet(ui, project) {
  if (!ui || !ui.sheet) return '';
  const s = ui.sheet;
  if (s.type === 'addroom') return project ? addRoomSheet(project) : '';
  if (s.type === 'projects') return projectsSheet();
  if (s.type === 'prompt') return promptSheet(s);
  if (s.type === 'settings') return settingsSheet();
  return '';
}

// ============================================================
// Surgical DOM update — called on qty input, never re-renders the list.
// Caller mutates state first; this only reads state + writes the DOM.
// ============================================================
export function updateAfterChange(project, room, itemId, overrides) {
  if (!room) return;
  const rid = room.instanceId;
  const sel = project.selections?.[rid];

  // Line cell
  const line = calcLine(itemId, sel?.[itemId], overrides);
  const lineEl = document.querySelector(`[data-line="${cssEsc(rid)}:${cssEsc(itemId)}"]`);
  if (lineEl) {
    lineEl.textContent = line > 0 ? fmt(line) : '—';
    lineEl.classList.toggle('is-zero', !(line > 0));
  }

  // Group subtotal — find the group (in this room's type) that owns the item.
  const groups = ROOM_TYPES[room.typeId]?.groups || [];
  const groupId = groups.find((g) => groupItemIds(g).includes(itemId));
  if (groupId) {
    const sub = groupSubtotal(groupId, sel, overrides);
    const gEl = document.querySelector(`[data-grouptotal="${cssEsc(rid)}:${cssEsc(groupId)}"]`);
    if (gEl) {
      gEl.textContent = sub > 0 ? fmt(sub) : '—';
      gEl.classList.toggle('is-zero', !(sub > 0));
    }
  }

  // Header running total (whole project)
  const totalEl = document.querySelector('[data-total]');
  if (totalEl) totalEl.textContent = fmt(calcGrand(project, overrides));

  // Progress bar + label
  const prog = progress(project, overrides);
  const barEl = document.querySelector('[data-progress-bar]');
  if (barEl) barEl.style.width = prog.pct + '%';
  const progEl = document.querySelector('[data-progress]');
  if (progEl) progEl.textContent = `${prog.done}/${prog.total} groups · ${prog.pct}%`;
}

// Escape a string for safe use inside a CSS attribute-selector value.
function cssEsc(s) {
  if (window.CSS && CSS.escape) return CSS.escape(String(s));
  return String(s).replace(/["\\]/g, '\\$&');
}
