import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { compareTerrainNodeDistance } from '../scripts/mcm-reference/compare-terrain-node-distance.mjs';

for (const [kind, cases, words] of [['synthetic', 8192, 49152], ['live', 31990, 191940]]) {
  test(`terrain distance matches isolated original executions with ${kind} inputs`, () => {
    const fixture = JSON.parse(brotliDecompressSync(fs.readFileSync(
      new URL(`./fixtures/mcm/terrain-node-distance-${kind}-wine11.json.br`, import.meta.url),
    )));
    const input = Buffer.from(fixture.inputHex, 'hex');
    const output = Buffer.from(fixture.outputHex, 'hex');
    for (const [name, bytes] of [['input', input], ['output', output]]) {
      assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.provenance[name + 'Sha256']);
    }
    assert.deepEqual(compareTerrainNodeDistance(input, output), { cases, words, differences: 0, examples: [] });
    output[0] ^= 1;
    assert.equal(compareTerrainNodeDistance(input, output).differences, 1);
    assert.throws(() => compareTerrainNodeDistance(input, output.subarray(0, -1)), /Incomplete/);
  });
}
