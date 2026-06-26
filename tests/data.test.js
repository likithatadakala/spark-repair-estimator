import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, ITEMS, GROUP_DEFS, ROOM_TYPES } from '../js/data.js';

test('parseCSV handles quoted fields and commas', () => {
  const rows = parseCSV('id,name,cost,unit\nig-08,"Drywall Repair",900.00,"1,000 sqft"');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Drywall Repair');
  assert.equal(rows[0].unit, '1,000 sqft');
  assert.equal(rows[0].cost, '900.00');
});

test('ITEMS contains parsed CSV items with numeric cost', () => {
  assert.ok(ITEMS['ig-01'], 'ig-01 exists');
  assert.equal(typeof ITEMS['ig-01'].cost, 'number');
  assert.equal(ITEMS['ig-05'].name, 'Vinyl Plank');
});

test('there are 7 room types with the brief-specified groups', () => {
  assert.equal(Object.keys(ROOM_TYPES).length, 7);
  assert.deepEqual(ROOM_TYPES.bedroom.groups, ['flooring','paint','doors','closet']);
  assert.deepEqual(ROOM_TYPES.living.groups, ['flooring','paint','doors','lighting']);
  assert.deepEqual(ROOM_TYPES.bathroom.groups, ['vanity','tub','tile']);
});

test('every group definition references only known item ids', () => {
  for (const [gid, ids] of Object.entries(GROUP_DEFS)) {
    for (const id of ids) assert.ok(ITEMS[id], `${gid} references unknown ${id}`);
  }
});
