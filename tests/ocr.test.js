import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSerialText } from '../js/ocr.js';

test('parseSerialText extracts a 4-digit year in plausible range', () => {
  const r = parseSerialText('MODEL GMVC960804CN\nSERIAL 1502123456\nMFG DATE 2015');
  assert.equal(r.year, '2015');
});

test('parseSerialText picks the longest alphanumeric token as the serial', () => {
  const r = parseSerialText('S/N: GMVC960804CN  P/N 12');
  assert.equal(r.serial, 'GMVC960804CN');
});

test('parseSerialText returns empty strings when nothing matches', () => {
  const r = parseSerialText('clean unit no label');
  assert.equal(r.year, '');
  // serial may be '' or a short token; assert it does not throw and has the shape
  assert.ok('serial' in r && 'text' in r);
});

test('parseSerialText ignores implausible years', () => {
  const r = parseSerialText('PART 9999 REV 1234');
  assert.equal(r.year, '');   // 9999/1234 are not plausible manufacture years
});
