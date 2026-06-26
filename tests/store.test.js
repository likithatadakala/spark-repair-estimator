import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCost, calcLine, calcRoom, calcGrand, progress } from '../js/store.js';
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
