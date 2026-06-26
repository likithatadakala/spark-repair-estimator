import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRows } from '../js/export.js';
import { state } from '../js/store.js';

function project(){
  return {
    name:'123 Main', rooms:[{instanceId:'r1', typeId:'interior'}],
    selections:{ r1:{ 'ig-05':{checked:true, qty:'10'}, 'ig-06':{checked:false, qty:'5'}, 'ig-01':{checked:true, qty:''} } },
    noAction:{}, photoRefs:{}, priceOverrides:{}, deal:{arv:'',purchasePrice:'',holdingCosts:''},
  };
}

test('buildRows includes only checked items with qty>0 and computes totals', () => {
  state.catalogEdits = { customItems: [], hiddenItems: [] }; state.globalPrices = {};
  const p = project();
  const { sections, grand } = buildRows(p, { project:{}, global:{} });
  // one room section, one row (ig-05 vinyl 2.5*10=25); ig-06 unchecked, ig-01 qty empty -> excluded
  const all = sections.flatMap(s => s.rows);
  assert.equal(all.length, 1);
  assert.equal(all[0].name, 'Vinyl Plank');
  assert.equal(all[0].total, 25);
  assert.equal(grand, 25);
});

test('buildRows omits empty rooms', () => {
  state.catalogEdits = { customItems: [], hiddenItems: [] }; state.globalPrices = {};
  const p = project(); p.selections = {};
  const { sections, grand } = buildRows(p, { project:{}, global:{} });
  assert.equal(sections.length, 0);
  assert.equal(grand, 0);
});
