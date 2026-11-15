import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {mcmRenderBinding} from '../src/physics/mcm/render-binding.js';
const read = name => JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}.json.br`, import.meta.url))));
test('native binding handler matches callback order, binding state and actual CALL stack stores', () => {
  const f = read('render-binding-wine11'), input = Buffer.from(f.input, 'base64'), output = Buffer.from(f.output, 'base64');
  assert.equal(input.length, 4096 * 12); assert.equal(output.length, 4096 * 44);
  const coverage = new Set();
  for (let i = 0; i < 4096; i++) {
    const [slot, previous, value] = Array.from({length: 3}, (_, j) => input.readUInt32LE(i * 12 + j * 4));
    coverage.add(`${slot}/${!!previous}/${!!value}`);
    const r = mcmRenderBinding({slot, previous, value, handlerEntryEsp: 0x10000, moduleBase: 0x10000000});
    const actual = [r.calls.length, r.binding, ...r.calls.flatMap(c => [c.state, c.store ? c.store.value - 0x10000000 : 0, c.store ? (c.store.address - 0x10000) >>> 0 : 0])];
    while (actual.length < 11) actual.push(0);
    for (let j = 0; j < 11; j++) assert.equal(actual[j], output.readUInt32LE(i * 44 + j * 4), `case ${i} word ${j}`);
  }
  assert.equal(coverage.size, 24);
});
test('live binding calls write the derived return address, including four bike-slot overlaps', () => {
  const f = read('render-binding-live-wine11');
  assert.equal(f.cases.length, 38); assert.match(f.provenance.cleanup, /debugger=0 clean=1/);
  assert.equal((f.provenance.cleanup.match(/restored=1/g) ?? []).length, 173);
  let overlaps = 0;
  for (const c of f.cases) {
    assert.equal(c.input.opcode, 20);
    assert.equal(c.return.frame, c.input.frame);
    for (const store of c.stores) assert.equal(store.frame, c.input.frame);
    const model = mcmRenderBinding({...c.input, handlerEntryEsp: c.input.esp, moduleBase: 0x7a770000});
    const calls = model.calls.filter(c => c.store);
    assert.deepEqual(calls.map(c => ({...c.store, state: c.state})), c.stores.map(c => ({address: c.address, value: c.value, state: c.state})));
    assert.deepEqual(calls.at(-1).store, {address: c.return.address, value: c.return.value});
    assert.equal(model.calls.at(-1).store, null, 'Tail jump must not invent a CALL write');
    overlaps += Number(c.return.address === 0x22f038);
  }
  assert.equal(overlaps, 4);
});
