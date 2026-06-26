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
