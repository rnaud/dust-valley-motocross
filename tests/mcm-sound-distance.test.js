import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareSoundDistance} from '../scripts/mcm-reference/compare-sound-distance.mjs';
test('sound distance and attenuation match 664 complete original executions',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/sound-distance-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 assert.deepEqual(compareSoundDistance(input,output),{cases:664,comparedWords:1992,differences:[]});
 output[8]^=1;assert.deepEqual(compareSoundDistance(input,output).differences.map(d=>[d.case,d.word]),[[0,2]]);
});
