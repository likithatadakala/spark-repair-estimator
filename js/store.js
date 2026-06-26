import { ITEMS, GROUP_DEFS, ROOM_TYPES } from './data.js';

// ---- Runtime catalog (base ITEMS + custom items − hidden items) ----
export function getItem(id){
  return ITEMS[id] || state.catalogEdits.customItems.find(ci => ci.id === id) || null;
}
export function groupItemIds(groupId){
  const hidden = new Set(state.catalogEdits.hiddenItems);
  const base = (GROUP_DEFS[groupId] || []).filter(id => !hidden.has(id));
  const customs = state.catalogEdits.customItems.filter(ci => ci.groupId === groupId).map(ci => ci.id);
  return [...base, ...customs];
}

// overrides = { project:{itemId:cost}, global:{itemId:cost} }
export function resolveCost(itemId, overrides) {
  if (overrides.project && itemId in overrides.project) return overrides.project[itemId];
  if (overrides.global  && itemId in overrides.global)  return overrides.global[itemId];
  return getItem(itemId)?.cost ?? 0;
}

export function calcLine(itemId, sel, overrides) {
  if (!sel || !sel.checked) return 0;
  const q = parseFloat(sel.qty);
  if (!q || q <= 0) return 0;
  return q * resolveCost(itemId, overrides);
}

function roomItemIds(typeId) {
  return ROOM_TYPES[typeId].groups.flatMap(g => groupItemIds(g));
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
      const anyChecked = groupItemIds(g).some(id => project.selections?.[r.instanceId]?.[id]?.checked);
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
  const type = ROOM_TYPES[typeId];
  if (!type) return null;
  // Singleton room types (whole-house sections) may only exist once per project.
  if (type.singleton && project.rooms.some(r => r.typeId === typeId)) return null;
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

// ============================================================
// PRICING & CATALOG MUTATORS
// ============================================================
export function setGlobalPrice(itemId, cost){
  const c = parseFloat(cost);
  if (!isNaN(c) && c >= 0){ state.globalPrices[itemId] = c; persist(); }
}

export function setProjectPrice(project, itemId, cost){
  const c = parseFloat(cost);
  if (cost === '' || cost == null || isNaN(c)){
    delete project.priceOverrides[itemId];
  } else if (c >= 0){
    project.priceOverrides[itemId] = c;
  }
  persist();
}

export function resetGlobalPrices(){ state.globalPrices = {}; persist(); }

export function applyPriceCSV(rows){
  let n = 0;
  for (const r of rows){
    const id = (r.id || '').trim();
    const c = parseFloat(r.cost);
    if (id && !isNaN(c) && c >= 0){ state.globalPrices[id] = c; n++; }
  }
  persist();
  return n;
}

export function addCustomItem({ name, cost, unit, groupId }){
  const id = uid('cust');
  state.catalogEdits.customItems.push({
    id, name: name || 'Custom Item', cost: parseFloat(cost) || 0,
    unit: unit || 'ea.', groupId, serial: false,
  });
  persist();
  return id;
}

export function hideItem(itemId){
  if (!state.catalogEdits.hiddenItems.includes(itemId)) state.catalogEdits.hiddenItems.push(itemId);
  // For custom items, also remove them outright so they never reappear.
  state.catalogEdits.customItems = state.catalogEdits.customItems.filter(ci => ci.id !== itemId);
  persist();
}

export function unhideItem(itemId){
  state.catalogEdits.hiddenItems = state.catalogEdits.hiddenItems.filter(x => x !== itemId);
  persist();
}
