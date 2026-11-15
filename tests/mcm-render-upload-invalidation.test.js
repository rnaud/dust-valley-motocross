import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {mcmRenderUploadInvalidation} from '../src/physics/mcm/render-upload-invalidation.js';

test('command 33 matches intact native dispatch and context writes across 4096 cases', () => {
  const fixture = JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-upload-invalidation-wine11.json.br', import.meta.url))));
  const input = Buffer.from(fixture.input, 'base64'), output = Buffer.from(fixture.output, 'base64');
  assert.equal(input.length, 4096 * 56); assert.equal(output.length, 4096 * 48);
  for (let i = 0; i < 4096; i++) {
    const a = Array.from({length: 14}, (_, j) => input.readUInt32LE(i * 56 + j * 4));
    const r = mcmRenderUploadInvalidation(a.slice(0, 5), a.slice(6, 6 + a[5])), c = r.callback;
    const actual = [Number(!!c), c?.slot ?? 0, c?.start ?? 0, c?.count ?? 0, ...r.contextFlags, ...a.slice(6 + a[5])];
    for (let j = 0; j < 12; j++) assert.equal(actual[j], output.readUInt32LE(i * 48 + j * 4), `case ${i} word ${j}`);
  }
});

test('aligned endpoints include the extra native register and wrap before shifting', () => {
  assert.deepEqual(mcmRenderUploadInvalidation([33, 6, 256, 64, 0x10000], [1]), {
    callback: {slot: 0x14, start: 16, count: 5}, contextFlags: Uint32Array.of(0x10001)
  });
  assert.deepEqual(mcmRenderUploadInvalidation([33, 7, 0xfffffff0, 0, 0], []).callback,
    {slot: 0x18, start: 0xfffffff, count: 0xf0000001});
  assert.throws(() => mcmRenderUploadInvalidation([43, 6, 0, 0, 0], []), /command 33/);
});
