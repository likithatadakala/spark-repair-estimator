import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCost, calcLine, calcRoom, calcGrand, progress,
  state, getItem, groupItemIds, addCustomItem, hideItem, setGlobalPrice, setProjectPrice, applyPriceCSV } from '../js/store.js';
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

// reset runtime catalog between catalog tests
function resetCatalog(){ state.catalogEdits = { customItems: [], hiddenItems: [] }; state.globalPrices = {}; }

test('getItem resolves catalog items and custom items', () => {
  resetCatalog();
  assert.equal(getItem('ig-01').name, 'Refinish Hardwood Floor');
  const id = addCustomItem({ name:'Closet Shelving', cost:120, unit:'LF', groupId:'closet' });
  assert.equal(getItem(id).name, 'Closet Shelving');
  assert.equal(getItem(id).cost, 120);
  assert.equal(getItem('nope'), null);
});

test('groupItemIds includes customs and excludes hidden', () => {
  resetCatalog();
  const base = groupItemIds('flooring');
  assert.ok(base.includes('ig-01'));
  hideItem('ig-01');
  assert.ok(!groupItemIds('flooring').includes('ig-01'));
  const id = addCustomItem({ name:'Epoxy Floor', cost:3, unit:'sqft', groupId:'flooring' });
  assert.ok(groupItemIds('flooring').includes(id));
  resetCatalog();
});

test('resolveCost falls back to a custom item base cost', () => {
  resetCatalog();
  const id = addCustomItem({ name:'X', cost:50, unit:'ea.', groupId:'pest' });
  assert.equal(resolveCost(id, { project:{}, global:{} }), 50);
  resetCatalog();
});

test('applyPriceCSV updates global prices and returns count', () => {
  resetCatalog();
  const n = applyPriceCSV([{ id:'ig-01', cost:'9.5' }, { id:'ig-02', cost:'bad' }, { id:'ig-03', cost:'3' }]);
  assert.equal(n, 2);
  assert.equal(state.globalPrices['ig-01'], 9.5);
  resetCatalog();
});
