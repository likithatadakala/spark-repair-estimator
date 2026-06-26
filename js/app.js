import { loadAll, activeProject, newProject, overridesFor, persist, persistNow,
  state, addRoom, removeRoom, deleteProject, switchProject, renameProject } from './store.js';
import { renderProject, renderRoom, renderSheet, updateAfterChange } from './views.js';

const app = document.getElementById('app');
let view = { name: 'project' };      // or { name:'room', room:'<instanceId>' }
const expandedGroups = new Set();    // groupIds expanded in the current room
let ui = { sheet: null };            // bottom-sheet UI state

function currentRoom(p){ return p.rooms.find(r => r.instanceId === view.room) || null; }

function render(){
  const p = activeProject();
  if (view.name === 'room'){
    const room = currentRoom(p);
    if (!room){ view = { name:'project' }; }      // room was removed; fall back
  }
  const mainHtml = view.name === 'room'
    ? renderRoom(p, currentRoom(p), overridesFor(p), expandedGroups)
    : renderProject(p, overridesFor(p));
  app.innerHTML = mainHtml + renderSheet(ui, p);

  // Focus + select the prompt input when a prompt sheet is open.
  if (ui.sheet?.type === 'prompt'){
    requestAnimationFrame(() => {
      const inp = document.getElementById('sheet-input');
      if (inp){ inp.focus(); inp.select(); }
    });
  }
}

function rerenderPreservingScroll(){
  const sc = app.querySelector('[data-scroll]');
  const top = sc ? sc.scrollTop : 0;
  render();
  const sc2 = app.querySelector('[data-scroll]');
  if (sc2) sc2.scrollTop = top;
}

loadAll();
if (!activeProject()) newProject('New Estimate');
render();

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = el.dataset.action;
  const p = activeProject();

  if (a === 'open-room'){ view = { name:'room', room: el.dataset.room }; expandedGroups.clear(); render(); window.scrollTo(0,0); return; }
  if (a === 'back'){ view = { name:'project' }; render(); window.scrollTo(0,0); return; }

  if (a === 'toggle-group'){ const g = el.dataset.group; expandedGroups.has(g) ? expandedGroups.delete(g) : expandedGroups.add(g); rerenderPreservingScroll(); return; }

  if (a === 'toggle'){
    const { room, item } = el.dataset;
    const sel = (p.selections[room] ||= {});
    const cur = (sel[item] ||= { checked:false, qty:'' });
    cur.checked = !cur.checked;
    if (!cur.checked) cur.qty = '';
    persist();
    rerenderPreservingScroll();
    // focus the qty input that just appeared (escape ids for selector safety)
    if (cur.checked) {
      const ce = (s) => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '\\$&');
      app.querySelector(`[data-action="qty"][data-item="${ce(item)}"][data-room="${ce(room)}"]`)?.focus();
    }
    return;
  }

  if (a === 'noaction'){
    const { room, group } = el.dataset;
    const na = (p.noAction[room] ||= {});
    na[group] = !na[group];
    persist();
    rerenderPreservingScroll();
    return;
  }

  // --- Room add / remove ---
  if (a === 'add-room'){ ui.sheet = { type:'addroom' }; render(); return; }
  if (a === 'create-room'){ addRoom(p, el.dataset.type); ui.sheet = null; render(); return; }
  if (a === 'remove-room'){
    if (confirm('Remove this room? Its entries will be lost.')){
      removeRoom(p, el.dataset.room);
      if (view.name === 'room' && view.room === el.dataset.room) view = { name:'project' };
      render();
    }
    return;
  }

  // --- Project management ---
  if (a === 'projects'){ ui.sheet = { type:'projects' }; render(); return; }
  if (a === 'switch-project'){
    switchProject(el.dataset.id); view = { name:'project' };
    expandedGroups.clear(); ui.sheet = null; render(); return;
  }
  if (a === 'new-project'){ ui.sheet = { type:'prompt', mode:'new', value:'' }; render(); return; }
  if (a === 'rename-project'){
    const id = el.dataset.id || state.activeId;
    const cur = state.projects.find(x => x.id === id);
    ui.sheet = { type:'prompt', mode:'rename', id, value: cur?.name || '' };
    render(); return;
  }
  if (a === 'delete-project'){
    const id = el.dataset.id;
    const proj = state.projects.find(x => x.id === id);
    if (confirm('Delete "' + (proj?.name || 'project') + '"? This cannot be undone.')){
      deleteProject(id);
      if (!activeProject()) newProject('New Estimate');
      view = { name:'project' }; render();
    }
    return;
  }
  if (a === 'prompt-save'){ savePrompt(); return; }
  if (a === 'sheet-close'){ ui.sheet = null; render(); return; }

  // settings / deal / export / scan-serial: later tasks
  console.log('action:', a);
});

// Shared prompt-save logic (used by Save button + Enter key).
function savePrompt(){
  if (ui.sheet?.type !== 'prompt') return;
  const val = document.getElementById('sheet-input')?.value.trim();
  if (!val){ ui.sheet = null; render(); return; }
  if (ui.sheet.mode === 'new'){
    newProject(val); view = { name:'project' }; expandedGroups.clear();
  } else {
    renameProject(ui.sheet.id, val);
  }
  ui.sheet = null; render();
}

// Enter-to-save / Escape-to-close on the prompt input.
app.addEventListener('keydown', (e) => {
  if (ui.sheet?.type !== 'prompt') return;
  if (e.target?.id !== 'sheet-input') return;
  if (e.key === 'Enter'){ e.preventDefault(); savePrompt(); }
  else if (e.key === 'Escape'){ e.preventDefault(); ui.sheet = null; render(); }
});

app.addEventListener('input', (e) => {
  const el = e.target.closest('[data-action="qty"]'); if (!el) return;
  const { room, item } = el.dataset;
  const p = activeProject();
  const sel = (p.selections[room] ||= {});
  (sel[item] ||= { checked:true, qty:'' }).qty = el.value;
  updateAfterChange(p, currentRoom(p), item, overridesFor(p));   // SURGICAL — no re-render
  persist();
});

window.addEventListener('pagehide', persistNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) persistNow(); });
