import { loadAll, activeProject, newProject, overridesFor, persist, persistNow,
  state, addRoom, removeRoom, deleteProject, switchProject, renameProject,
  setProjectPrice, resetGlobalPrices, applyPriceCSV, addCustomItem, hideItem, uid } from './store.js';
import { parseCSV } from './data.js';
import { putPhoto, getPhoto, delPhoto, compress } from './db.js';
import { renderProject, renderRoom, renderSheet, updateAfterChange, renderDealResult } from './views.js';
import { readSerial } from './ocr.js';
import { exportProject } from './export.js';

const app = document.getElementById('app');
let view = { name: 'project' };      // or { name:'room', room:'<instanceId>' }
const expandedGroups = new Set();    // groupIds expanded in the current room
let ui = { sheet: null };            // bottom-sheet UI state
let photoUrls = [];                  // object-URLs from the current render (revoked next render)

function currentRoom(p){ return p.rooms.find(r => r.instanceId === view.room) || null; }

// Async thumbnail hydration. render() rebuilds innerHTML each call, so we revoke
// the previous render's object-URLs first (no leak), then set src on any thumb
// that hasn't been loaded yet. Fire-and-forget — never awaited by render().
async function hydratePhotos(){
  for (const u of photoUrls) URL.revokeObjectURL(u);
  photoUrls = [];
  const imgs = app.querySelectorAll('img.thumb[data-photo-id]:not([data-loaded])');
  for (const img of imgs){
    try {
      const blob = await getPhoto(img.dataset.photoId);
      if (blob){ const url = URL.createObjectURL(blob); photoUrls.push(url); img.src = url; img.dataset.loaded = '1'; }
    } catch (e) { console.warn('photo load failed', e); }
  }
}

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

  hydratePhotos();   // async, fire-and-forget — hydrates thumbnails from IndexedDB
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
  // --- Settings & pricing ---
  if (a === 'settings'){ ui.sheet = { type:'settings' }; render(); return; }
  if (a === 'reset-prices'){ if (confirm('Reset all prices to defaults?')){ resetGlobalPrices(); render(); } return; }
  if (a === 'save-custom-item'){
    const name = document.getElementById('ci-name')?.value.trim();
    const cost = document.getElementById('ci-cost')?.value;
    const unit = document.getElementById('ci-unit')?.value.trim();
    const groupId = document.getElementById('ci-group')?.value;
    if (name && groupId){ addCustomItem({ name, cost, unit, groupId }); }
    ui.sheet = null; render(); return;
  }
  if (a === 'delete-item'){
    if (confirm('Remove this item? It will be hidden from all projects.')){
      hideItem(el.dataset.item);
      rerenderPreservingScroll();
    }
    return;
  }

  if (a === 'prompt-save'){ savePrompt(); return; }
  if (a === 'sheet-close'){
    // The backdrop is an ancestor of the sheet, so blank-space clicks inside the
    // sheet bubble to it. Only close on a direct backdrop hit or an explicit button.
    if (el.classList.contains('sheet-backdrop') && e.target !== el) return;
    ui.sheet = null; render(); return;
  }

  // --- Photos (room-level + serial-item-level), keyed into project.photoRefs ---
  if (a === 'add-photo'){
    const key = el.dataset.key;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
    document.body.appendChild(input);            // must be in DOM for reliable Android capture
    input.addEventListener('change', async () => {
      try {
        const files = Array.from(input.files || []);
        if (files.length){
          const proj = activeProject();
          const arr = (proj.photoRefs[key] ||= []);
          for (const file of files){
            const blob = await compress(file);
            const id = uid('ph');
            await putPhoto(id, blob);
            arr.push({ id, name: file.name || (id + '.jpg') });
          }
          persist();
          rerenderPreservingScroll();
        }
      } catch (err){ console.warn('add photo failed', err); alert('Could not add photo.'); }
      finally { input.remove(); }
    }, { once: true });
    input.click();
    return;
  }

  if (a === 'remove-photo'){
    const { key, id } = el.dataset;
    const proj = activeProject();
    const arr = proj.photoRefs[key] || [];
    proj.photoRefs[key] = arr.filter(ph => ph.id !== id);
    delPhoto(id).catch(e => console.warn('del photo failed', e));   // fire-and-forget
    persist();
    rerenderPreservingScroll();
    return;
  }

  // --- Serial-number OCR (scan -> store photo -> OCR -> confirm sheet) ---
  if (a === 'scan-serial'){
    const { room, item } = el.dataset;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      try {
        const file = (input.files || [])[0];
        if (!file) return;
        const proj = activeProject();
        const key = room + ':' + item;
        const blob = await compress(file);
        const id = uid('ph');
        await putPhoto(id, blob);
        (proj.photoRefs[key] ||= []).push({ id, name: file.name || (id + '.jpg') });
        persist();
        // show loading sheet, then OCR
        ui.sheet = { type:'ocr', room, item, serial:'', year:'', text:'', loading:true };
        render();
        try {
          const res = await readSerial(blob);
          ui.sheet = { type:'ocr', room, item, serial:res.serial, year:res.year, text:res.text, loading:false };
          render();
        } catch (ocrErr){
          ui.sheet = null; render();
          alert('Serial scanning needs an internet connection the first time. Your photo was saved — try Scan again once online.');
        }
      } catch (err){ console.warn('scan-serial failed', err); alert('Could not capture photo.'); }
      finally { input.remove(); }
    }, { once:true });
    input.click();
    return;
  }

  if (a === 'ocr-save'){
    if (ui.sheet?.type === 'ocr'){
      const { room, item } = ui.sheet;
      const serial = document.getElementById('ocr-serial')?.value.trim() || '';
      const year = document.getElementById('ocr-year')?.value.trim() || '';
      const proj = activeProject();
      const sel = (proj.selections[room] ||= {});
      const cur = (sel[item] ||= { checked:false, qty:'' });
      cur.year = year; cur.serial = serial;
      persist();
    }
    ui.sheet = null; render();
    return;
  }

  // --- Deal / margin analyzer ---
  if (a === 'deal'){ ui.sheet = { type:'deal' }; render(); return; }

  // --- Export (styled Excel + photos bundled as a ZIP) ---
  if (a === 'export'){
    el.disabled = true;
    exportProject(p, overridesFor(p))
      .catch(err => { console.warn('export failed', err); alert('Could not export. Please try again.'); })
      .finally(() => { el.disabled = false; });
    return;
  }

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
  // Deal analyzer inputs — surgically replace ONLY #deal-result so the focused
  // input keeps focus while margin/ROI/max-offer update live as you type.
  const dealEl = e.target.closest('[data-action="deal-input"]');
  if (dealEl){
    const p = activeProject();
    p.deal[dealEl.dataset.field] = dealEl.value;
    persist();
    const host = document.getElementById('deal-result');
    if (host) host.outerHTML = renderDealResult(p, overridesFor(p));
    return;
  }

  const el = e.target.closest('[data-action="qty"], [data-action="price"]'); if (!el) return;
  const a = el.dataset.action;
  const { room, item } = el.dataset;
  const p = activeProject();

  if (a === 'qty'){
    const sel = (p.selections[room] ||= {});
    (sel[item] ||= { checked:true, qty:'' }).qty = el.value;
    persist();
  } else { // price — per-project unit cost override (setProjectPrice persists internally)
    setProjectPrice(p, item, el.value);
  }
  updateAfterChange(p, currentRoom(p), item, overridesFor(p));   // SURGICAL — no re-render
});

// Delegated change handler for the Settings price-CSV file input.
app.addEventListener('change', (e) => {
  const input = e.target.closest('#price-csv-input'); if (!input) return;
  const file = input.files && input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCSV(String(reader.result || ''));
      const n = applyPriceCSV(rows);
      alert(n + ' prices updated');
    } catch (err) {
      console.warn('price CSV import failed', err);
      alert('Could not read that CSV.');
    }
    ui.sheet = null; render();
  };
  reader.readAsText(file);
});

window.addEventListener('pagehide', persistNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) persistNow(); });
