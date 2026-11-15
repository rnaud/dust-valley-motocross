import assert from 'node:assert/strict';
import {compareLiveRetainedRiderFrames} from './compare-live-retained-rider-frames.mjs';
import {composeMcmWrapperProduct} from '../../src/physics/mcm/wrapper-product.js';
import {projectMcmBounds} from '../../src/physics/mcm/projected-bounds.js';
import {multiplyWineRenderMatrix} from '../../src/physics/mcm/wine-render-matrix.js';
const floats = words => new Float32Array(Uint32Array.from(words).buffer);
const bits = values => [...new Uint32Array(values.buffer, values.byteOffset, values.length)];

// Retained physics -> actor geometry -> visibility -> observed SSE value check.
// Camera matrices and renderer world transform remain explicit stage inputs.
// Observed stores are checked, never fed back into physics or used as gates.
export function analyzeMovingVisibility(input, rows, events, render, worldMatrix, {worldCallerWrites=null}={}) {
  assert.equal(worldMatrix.length, 16);
  const wrappers = new Map(), culls = new Map(), stores = new Map();
  let pending = null;
  for (const r of render) {
    const key = `${r.frame}/${r.actor}`;
    if (r.phase === 'wrapper') {
      assert.equal(r.words.length, 58); assert.ok(!wrappers.has(key), 'Repeated wrapper');
      wrappers.set(key, r);
    } else if (r.phase === 'wrapper-cull') {
      assert.ok(wrappers.has(key) && !culls.has(key), 'Unpaired culling result'); culls.set(key, r.result);
    } else if (r.phase === 'store-before') {
      assert.equal(pending, null, 'Nested SSE store'); pending = r;
    } else if (r.phase === 'store-after') {
      assert.ok(pending, 'Missing SSE source'); assert.equal(r.frame, pending.frame);
      assert.equal(r.value, pending.value, 'Actual SSE store differs');
      const storeKey = `${pending.frame}/${pending.actor}`;
      if (!stores.has(storeKey)) stores.set(storeKey, []);
      stores.get(storeKey).push(pending); pending = null;
    } else throw Error('Unknown visibility event');
  }
  assert.equal(pending, null, 'Unfinished SSE store');
  const decisions = [], checkedKeys = new Set(), predictedStores = [];
  let sourceWords = 0, accepted = 0, rejected = 0;
  const replay = compareLiveRetainedRiderFrames(input, rows, events, {
    worldCallerWrites,
    onWorldFrame({frame, sources}) {
      for (const source of sources) {
        const key = `${frame}/${source.actor}`, observed = wrappers.get(key);
        if (frame === rows.length / 2 - 1 && !observed) continue; // Capture ends at final bike return.
        assert.ok(observed, 'Missing retained actor wrapper'); assert.equal(observed.node, source.node);
        assert.equal(observed.hidden, 0, 'Hidden-node path is outside this visibility stage');
        const words = observed.words;
        assert.deepEqual([...bits(source.local), ...bits(source.center), ...bits(source.extent)],
          [...words.slice(0, 16), ...words.slice(32, 38)], 'Retained draw geometry differs');
        sourceWords += 22;
        const matrix = composeMcmWrapperProduct(floats(words.slice(16, 32)), source.local);
        const result = projectMcmBounds({matrix, center: source.center, extent: source.extent, viewport: words.slice(38, 42)});
        assert.equal(result.accepted, culls.get(key), 'Computed visibility differs');
        checkedKeys.add(key); accepted += result.accepted; rejected += 1 - result.accepted;
        decisions.push({frame, actor: source.actor, accepted: result.accepted});
        for (const store of stores.get(key) ?? []) {
          assert.equal(result.accepted, 1, 'Culled actor emitted an SSE store');
          const product = multiplyWineRenderMatrix(floats(words.slice(42, 58)), worldMatrix);
          const value = bits(product)[2];
          assert.equal(value, store.value, 'Computed SSE value differs');
          predictedStores.push({frame, actor: source.actor, address: store.scratch, value});
        }
      }
    }
  });
  // Do not silently discard stores from an actor whose physics was not replayed.
  for (const key of stores.keys()) assert.ok(checkedKeys.has(key), 'Unmodeled actor emitted an SSE store');
  let carryChecks = 0, laterWriterIntervals = 0;
  const lastByFrame = new Map(predictedStores.map(s => [s.frame, s]));
  for (const [frame, store] of lastByFrame) {
    const next = rows[(frame + 1) * 2]; if (!next) continue;
    carryChecks++;
    laterWriterIntervals += Number(Buffer.from(next.stackHex, 'hex').readUInt32LE(0x54) !== store.value);
  }
  return {scope: 'Retained actor geometry and computed visibility; camera/world matrices are stage inputs. '+(worldCallerWrites?'World writes are supplied by an explicit model callback. ':'SSE eligibility beyond visibility and subsequent world writes remain unmodeled. ')+'No observed scratch injection.',
    geometrySamples: checkedKeys.size, sourceWords, accepted, rejected, decisions,
    unmodeledActorWrappers: wrappers.size - checkedKeys.size, sseStores: predictedStores.length, carryChecks, laterWriterIntervals,
    callerScratchMode: replay.callerScratchMode, modeledCallerScratchWords: replay.modeledCallerScratchWords, observedCallerScratchWords: replay.observedCallerScratchWords, physicsScope: replay.scope,
    bikeFrames: replay.bikeFrames, riderTicks: replay.riderTicks, physicsDifferences: replay.physicsDifferences, visualDifferences: replay.visualDifferences};
}
