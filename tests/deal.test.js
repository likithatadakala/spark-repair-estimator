import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/deal.js';

test('analyze computes margin, roi, and 70%-rule max offer', () => {
  const r = analyze({ arv:215000, purchasePrice:120000, holdingCosts:0, repairs:38450 });
  assert.equal(r.margin, 215000 - 120000 - 38450);          // 56550
  assert.equal(r.maxOffer, Math.round(0.7*215000 - 38450));  // 112050
  assert.equal(r.overBudget, 120000 > r.maxOffer);           // true
  assert.ok(Math.abs(r.roi - (r.margin/(120000+38450))*100) < 1e-6);
});

test('analyze handles blank inputs as zero', () => {
  const r = analyze({ arv:'', purchasePrice:'', holdingCosts:'', repairs:0 });
  assert.equal(r.margin, 0); assert.equal(r.maxOffer, 0);
});
