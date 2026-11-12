import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compareLiveScheduler} from '../scripts/mcm-reference/compare-live.mjs';
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/live-scheduler-wine11.json', import.meta.url)));

test('recovered scheduler matches 300 observed live bike updates bit-for-bit', () => {
  let pairs = 0;
  for (const {rows} of fixtures.runs) {
    const result = compareLiveScheduler(rows);
    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.controlWords, [0x027f]);
    assert.equal(result.bikes.length, 2);
    pairs += result.pairs;
  }
  assert.equal(pairs, 300);
});

test('live comparator rejects truncated, mispaired and unsupported captures', () => {
  const rows = fixtures.runs[0].rows;
  assert.throws(() => compareLiveScheduler(rows.slice(0, -1)), /Incomplete/);
  const bad = structuredClone(rows.slice(0, 2));
  bad[1].bike = '00000000';
  assert.throws(() => compareLiveScheduler(bad), /without before/);
  bad[1].bike = bad[0].bike;
  bad[0].cw = 0x0c7f;
  assert.throws(() => compareLiveScheduler(bad), /control word/);
});

test('live comparator reports a changed observed output as a divergence', () => {
  const rows = structuredClone(fixtures.runs[0].rows.slice(0, 2));
  rows[1].dtBits ^= 1;
  const result = compareLiveScheduler(rows);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].field, 'dtBits');
});
