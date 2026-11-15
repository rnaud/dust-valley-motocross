import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync, gunzipSync} from 'node:zlib';
import {analyzeMovingVisibility} from '../scripts/mcm-reference/analyze-moving-visibility.mjs';
function fixture() {
  const f = JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/moving-visibility-wine11.json.br', import.meta.url))));
  const {terrain: t} = JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin', import.meta.url)))), cache = new Map();
  const node = id => {
    if (cache.has(id)) return cache.get(id);
    const raw = t.nodes[id], n = {...raw, ...t.banks[raw.bankIndex]}; cache.set(id, n);
    if (raw.children) n.children = raw.children.map(id => id === null ? null : node(id));
    return n;
  };
  f.input.terrain = {root: node(t.root), heightScale: t.heightScale, worldToGrid: t.worldToGrid};
  return f;
}
const run = f => analyzeMovingVisibility(f.input, f.rows, f.events, f.render, Float32Array.from(f.worldMatrix));
test('retained physics geometry predicts both culling transitions and the observed renderer values', () => {
  const f = fixture(), r = run(f);
  assert.deepEqual([r.geometrySamples, r.sourceWords, r.accepted, r.rejected, r.unmodeledActorWrappers], [82, 1804, 52, 30, 82]);
  assert.deepEqual([r.sseStores, r.carryChecks, r.laterWriterIntervals], [24, 24, 1]);
  assert.deepEqual([r.bikeFrames, r.riderTicks, r.physicsDifferences, r.visualDifferences], [42, 41, 0, 903525]);
  assert.equal(r.callerScratchMode, 'retained'); assert.equal(r.observedCallerScratchWords, 0);
  assert.match(r.physicsScope, /not full trajectory parity/);
  const actors = [...new Set(r.decisions.map(d => d.actor))];
  assert.equal(actors.length, 2);
  assert.deepEqual(actors.map(actor => r.decisions.find(d => d.actor === actor && !d.accepted).frame), [28, 24]);
  for (let frame = 0; frame < 42; frame++) {
    assert.equal(f.rows[frame * 2].requestedThrottle, Number(frame < 40));
    assert.equal(f.rows[frame * 2].requestedSteerBits, frame >= 20 ? 0xbe800000 : 0);
  }
  assert.match(f.provenance.run, /captured=84 status=1/);
  assert.match(f.provenance.cleanup, /debugger=0 clean=1/);
  assert.equal((f.provenance.cleanup.match(/restored=1/g) ?? []).length, 167);
});
test('captured actor geometry, culling and store outputs cannot silently drive the reconstruction', () => {
  const f = fixture(), wrapper = f.render.find(r => r.phase === 'wrapper');
  wrapper.words[32] ^= 1;
  assert.throws(() => run(f), /Retained draw geometry differs/);
  wrapper.words[32] ^= 1;
  const cull = f.render.find(r => r.phase === 'wrapper-cull'); cull.result ^= 1;
  assert.throws(() => run(f), /Computed visibility differs/);
  cull.result ^= 1;
  const before = f.render.find(r => r.phase === 'store-before'), after = f.render.find(r => r.phase === 'store-after');
  before.value ^= 1; after.value ^= 1;
  assert.throws(() => run(f), /Computed SSE value differs/);
});
