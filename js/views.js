import { ROOM_TYPES, GROUP_DEFS, GROUP_LABELS, ITEMS } from './data.js';
import { calcGrand, calcRoom, calcLine, progress, resolveCost } from './store.js';

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
    const anyChecked = (GROUP_DEFS[g] || []).some((id) => sel?.[id]?.checked);
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
  return (GROUP_DEFS[groupId] || []).reduce(
    (t, id) => t + calcLine(id, sel?.[id], overrides), 0);
}

function renderItemRow(room, itemId, sel, overrides) {
  const item = ITEMS[itemId];
  if (!item) return '';
  const cur = sel?.[itemId];
  const checked = !!cur?.checked;
  const line = calcLine(itemId, cur, overrides);
  const unitCost = resolveCost(itemId, overrides);
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

  const serialBlock = item.serial
    ? `<button class="scan-serial" type="button" data-action="scan-serial" data-room="${rid}" data-item="${iid}">
         ${ICON.camera}<span>Scan serial</span>
       </button>`
    : '';

  return `
    <div class="item-row${checked ? ' is-checked' : ''}">
      <button class="checkbox${checked ? ' is-checked' : ''}" type="button"
              data-action="toggle" data-room="${rid}" data-item="${iid}"
              role="checkbox" aria-checked="${checked}" aria-label="${esc(item.name)}">
        ${checked ? ICON.check : ''}
      </button>
      <div class="item-main">
        <span class="item-name">${esc(item.name)}</span>
        <span class="item-sub">${fmt(unitCost)} / ${esc(item.unit)}</span>
        ${qtyBlock}
        ${serialBlock}
      </div>
      <span class="line-total money${line > 0 ? '' : ' is-zero'}" data-line="${rid}:${iid}">${line > 0 ? fmt(line) : '—'}</span>
    </div>`;
}

function renderGroup(project, room, groupId, overrides, expanded) {
  const sel = project.selections?.[room.instanceId];
  const na = project.noAction?.[room.instanceId];
  const rid = esc(room.instanceId);
  const gid = esc(groupId);

  const noAction = !!na?.[groupId];
  const anyChecked = (GROUP_DEFS[groupId] || []).some((id) => sel?.[id]?.checked);
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
           ${(GROUP_DEFS[groupId] || []).map((id) => renderItemRow(room, id, sel, overrides)).join('')}
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
        <span style="min-width:var(--tap)"></span>
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
      ${groupsHtml}
    </main>
  </div>`;
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
  const groupId = groups.find((g) => (GROUP_DEFS[g] || []).includes(itemId));
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
