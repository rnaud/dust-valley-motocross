import assert from 'node:assert/strict';
import {mcmRenderUploadInvalidation} from '../../src/physics/mcm/render-upload-invalidation.js';
import {mcmApplyUploadBackend} from '../../src/physics/mcm/render-register-heap.js';
import {mcmRenderResourceUpload} from '../../src/physics/mcm/render-resource-upload.js';

export function analyzeRenderRegisterHeaps(cases) {
  let changedWords = 0;
  for (const {before, after, command, upload, config} of cases) {
    assert.equal(before.stage, 147); assert.equal(after.stage, 148);
    assert.equal(before.cs, after.cs); assert.equal(before.frame, after.frame);
    assert.equal(command.frame, before.frame);
    assert.equal(before.priority, after.priority);
    assert.equal(upload.frame, before.frame); assert.equal(upload.cs, before.cs);
    assert.equal(config.kind, upload.kind); assert.equal(config.cs, upload.cs);
    const computedCommand = mcmRenderResourceUpload({...upload, ...config}).command;
    assert.deepEqual([...computedCommand], command.words, 'Computed command differs');
    const heaps = structuredClone({vertex: before.vertex, pixel: before.pixel});
    const result = mcmRenderUploadInvalidation(computedCommand, before.contextFlags);
    mcmApplyUploadBackend(heaps, result.callback, before.priority);
    assert.deepEqual([...result.contextFlags], after.contextFlags, 'Context flags differ');
    for (const kind of ['vertex', 'pixel']) {
      assert.deepEqual(heaps[kind], after[kind], `${kind} register heap differs`);
      for (const field of ['nodes', 'present', 'positions'])
        for (let i = 0; i < before[kind][field].length; i++)
          changedWords += Number(before[kind][field][i] !== after[kind][field][i]);
    }
  }
  return {commands: cases.length, changedWords};
}
