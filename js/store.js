import { ITEMS, GROUP_DEFS, ROOM_TYPES } from './data.js';

// overrides = { project:{itemId:cost}, global:{itemId:cost} }
export function resolveCost(itemId, overrides) {
  if (overrides.project && itemId in overrides.project) return overrides.project[itemId];
  if (overrides.global  && itemId in overrides.global)  return overrides.global[itemId];
  return ITEMS[itemId]?.cost ?? 0;
}

export function calcLine(itemId, sel, overrides) {
  if (!sel || !sel.checked) return 0;
  const q = parseFloat(sel.qty);
  if (!q || q <= 0) return 0;
  return q * resolveCost(itemId, overrides);
}

function roomItemIds(typeId) {
  return ROOM_TYPES[typeId].groups.flatMap(g => GROUP_DEFS[g]);
}

export function calcRoom(typeId, selections, overrides) {
  return roomItemIds(typeId).reduce((t, id) => t + calcLine(id, selections?.[id], overrides), 0);
}

export function calcGrand(project, overrides) {
  return (project.rooms || []).reduce((t, r) =>
    t + calcRoom(r.typeId, project.selections?.[r.instanceId], overrides), 0);
}

// overrides param kept for API consistency with other calc functions even though unused here.
export function progress(project, overrides) {
  let total = 0, done = 0;
  for (const r of project.rooms || []) {
    for (const g of ROOM_TYPES[r.typeId].groups) {
      total++;
      const na = project.noAction?.[r.instanceId]?.[g];
      const anyChecked = GROUP_DEFS[g].some(id => project.selections?.[r.instanceId]?.[id]?.checked);
      if (na || anyChecked) done++;
    }
  }
  return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
}

// ============================================================
// PERSISTENCE & STATE  (impure — browser only)
// ============================================================
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
  const rooms = seed.map((typeId) => ({ instanceId: uid('rm'), typeId,
    label: typeId === 'bathroom' ? 'Bathroom 1' : null }));
  const p = { id, name: name || 'New Estimate', notes:'', createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString(), rooms, selections:{}, noAction:{}, photoRefs:{},
    priceOverrides:{}, deal:{arv:'',purchasePrice:'',holdingCosts:''} };
  state.projects.unshift(p); state.activeId = id; persist(); return p;
}

// ============================================================
// ROOM MUTATORS
// ============================================================
export function addRoom(project, typeId){
  if (!ROOM_TYPES[typeId]) return null;
  const instanceId = uid('rm');
  project.rooms.push({ instanceId, typeId, label: null });
  project.updatedAt = new Date().toISOString();
  persist();
  return instanceId;
}

export function removeRoom(project, instanceId){
  project.rooms = project.rooms.filter(r => r.instanceId !== instanceId);
  delete project.selections[instanceId];
  delete project.noAction[instanceId];
  delete project.photoRefs[instanceId];
  project.updatedAt = new Date().toISOString();
  persist();
}

export function deleteProject(id){
  state.projects = state.projects.filter(p => p.id !== id);
  if (state.activeId === id){
    state.activeId = state.projects[0]?.id || null;
  }
  persist();
}

export function switchProject(id){
  if (state.projects.some(p => p.id === id)) state.activeId = id;
  persist();
}

export function renameProject(id, name){
  const p = state.projects.find(x => x.id === id);
  if (p){ p.name = name; p.updatedAt = new Date().toISOString(); persist(); }
}
