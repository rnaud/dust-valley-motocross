import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {mcmHudMeasuredLineStores} from '../src/physics/mcm/hud-line-stores.js';
const read = name => JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}.json.br`, import.meta.url))));

test('native measured-line branches and all four local stores match 4096 cases', () => {
  const f = read('hud-line-stores-wine11'), input = Buffer.from(f.input, 'base64'), output = Buffer.from(f.output, 'base64');
  assert.equal(input.length, 4096 * 28); assert.equal(output.length, 4096 * 20);
  const offsets = [0x8ac, 0x89c, 0x87c, 0x8b8], counts = {draw: 0, prefix: 0, overflow: 0};
  for (let i = 0; i < 4096; i++) {
    const a = Array.from({length: 7}, (_, j) => input.readUInt32LE(i * 28 + j * 4));
    const r = mcmHudMeasuredLineStores({frameBase: 0x10000, fit: a[0], count: a[1], format: a[2]});
    const actual = [['draw', 'prefix', 'overflow'].indexOf(r.branch), ...a.slice(3)];
    for (const w of r.writes) actual[1 + offsets.indexOf(0x10000 - w.address)] = w.value;
    counts[r.branch]++;
    for (let j = 0; j < 5; j++) assert.equal(actual[j], output.readUInt32LE(i * 20 + j * 4), `case ${i}, word ${j}`);
  }
  assert.deepEqual(counts, {draw: 2006, prefix: 699, overflow: 1391});
});

test('the predicted HUD store overlaps the live bike slot and clears it at the exact instruction', () => {
  const f = read('hud-line-stores-live-wine11');
  assert.equal(f.rows.length, 18); assert.match(f.provenance.cleanup, /debugger=0 clean=1/);
  let clears = 0;
  for (let i = 0; i < f.rows.length; i += 3) {
    const [input, before, after] = f.rows.slice(i, i + 3);
    assert.deepEqual([input.stage, before.stage, after.stage], [167, 168, 169]);
    for (const key of ['frame', 'ebp', 'fit', 'count', 'format', 'address']) {
      assert.equal(input[key], before[key]); assert.equal(input[key], after[key]);
    }
    assert.equal(input.esp - after.esp, 28); assert.equal(before.esp, after.esp);
    assert.equal(input.value, before.value);
    const r = mcmHudMeasuredLineStores({frameBase: input.ebp, fit: input.fit, count: input.count, format: input.format});
    assert.equal(r.branch, 'draw');
    assert.equal(input.address, 0x22f038);
    assert.deepEqual(r.writes.find(w => w.address === input.address), {address: input.address, value: after.value});
    clears += Number(before.value !== after.value);
  }
  assert.equal(clears, 3);
});

test('unsupported layout branches do not invent a clear of the physics slot', () => {
  for (const args of [{fit: 3, count: 4, format: 0x124}, {fit: 4, count: 4, format: 0x8124}]) {
    const r = mcmHudMeasuredLineStores({frameBase: 0x22f8f0, ...args});
    assert.equal(r.writes.some(w => w.address === 0x22f038), false);
  }
});
