import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createMcmRegisterHeap, mcmApplyUploadBackend, mcmUpdateRegisterHeap} from '../src/physics/mcm/render-register-heap.js';
import {mcmRenderUploadInvalidation} from '../src/physics/mcm/render-upload-invalidation.js';
import {analyzeRenderRegisterHeaps} from '../scripts/mcm-reference/analyze-render-register-heap.mjs';
const read = name => JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}.json.br`, import.meta.url))));

test('intact command handler, both native backends and register heaps match sequential state changes', () => {
  const fixture = read('render-register-heap-wine11');
  const input = Buffer.from(fixture.input, 'base64'), output = Buffer.from(fixture.output, 'base64');
  assert.equal(input.length, 2048 * 40); assert.equal(output.length, 2048 * 1929 * 4);
  let heaps;
  for (let i = 0; i < 2048; i++) {
    const a = Array.from({length: 10}, (_, j) => input.readUInt32LE(i * 40 + j * 4));
    if (a[0]) heaps = {vertex: createMcmRegisterHeap(256), pixel: createMcmRegisterHeap(224)};
    const result = mcmRenderUploadInvalidation([33, ...a.slice(1, 5)], a.slice(7, 7 + a[6]));
    mcmApplyUploadBackend(heaps, result.callback, a[5]);
    const v = heaps.vertex, p = heaps.pixel;
    const actual = [v.next, p.next, ...v.nodes, ...v.present, ...v.positions, ...p.nodes, ...p.present, ...p.positions,
      ...result.contextFlags, ...a.slice(7 + a[6])];
    for (let j = 0; j < 1929; j++) assert.equal(actual[j], output.readUInt32LE((i * 1929 + j) * 4), `case ${i} word ${j}`);
  }
});

test('decreasing a priority preserves the native upward-only behavior', () => {
  const heap = createMcmRegisterHeap(4);
  mcmUpdateRegisterHeap(heap, 0, 20); mcmUpdateRegisterHeap(heap, 1, 10);
  mcmUpdateRegisterHeap(heap, 0, 1);
  assert.deepEqual([...heap.nodes.slice(2, 6)], [0, 1, 1, 10]);
  assert.equal(heap.next, 3);
  assert.throws(() => mcmUpdateRegisterHeap(heap, 4, 1), /outside backend heap/);
});

test('live follow-up commands reproduce both complete register heaps and context flags', () => {
  const live = read('render-register-heap-live-wine11');
  assert.deepEqual(analyzeRenderRegisterHeaps(live.cases), {commands: 192, changedWords: 3552});
  assert.match(live.provenance.cleanup, /debugger=0 clean=1/);
  const bad = structuredClone(live.cases);
  bad[0].after.vertex.nodes[3] ^= 1;
  assert.throws(() => analyzeRenderRegisterHeaps(bad), /register heap differs/);
});
