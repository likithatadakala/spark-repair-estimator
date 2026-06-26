import { loadAll, activeProject, newProject, overridesFor, persist, persistNow } from './store.js';
import { renderProject, renderRoom, updateAfterChange } from './views.js';

const app = document.getElementById('app');
let view = { name: 'project' };      // or { name:'room', room:'<instanceId>' }
const expandedGroups = new Set();    // groupIds expanded in the current room

function currentRoom(p){ return p.rooms.find(r => r.instanceId === view.room) || null; }

function render(){
  const p = activeProject();
  if (view.name === 'room'){
    const room = currentRoom(p);
    if (!room){ view = { name:'project' }; }      // room was removed; fall back
  }
  if (view.name === 'room'){
    app.innerHTML = renderRoom(p, currentRoom(p), overridesFor(p), expandedGroups);
  } else {
    app.innerHTML = renderProject(p, overridesFor(p));
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
    // focus the qty input that just appeared
    if (cur.checked) app.querySelector(`[data-action="qty"][data-item="${item}"][data-room="${room}"]`)?.focus();
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

  // settings / projects / rename-project / add-room / deal / export / scan-serial: later tasks
  console.log('action:', a);
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
