import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareViewMatrix} from '../scripts/mcm-reference/compare-view-matrix.mjs';
import {analyzeLiveViewMatrix} from '../scripts/mcm-reference/analyze-live-view-matrix.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/view-matrix-wine11.json.br',import.meta.url))));
test('original view expression matches 991 native camera and roll cases',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareViewMatrix(input,output),{cases:991,words:15856,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareViewMatrix(input,output).differences,1);
 assert.throws(()=>compareViewMatrix(input,output.subarray(0,-4)),/Incomplete/);
});
test('live computed views survive original setters and reproduce downstream render products',()=>{
 assert.deepEqual(analyzeLiveViewMatrix(fixture.live),{viewPairs:56,viewWords:896,viewSubmissions:9,products:41,productWords:656,ignoredViewSubmissions:0,ignoredProducts:3});
});
test('view chain rejects corrupted camera output, modified setters and incomplete observations',()=>{
 const changed=structuredClone(fixture.live);changed.find(r=>r.phase==='after-view').words[2]^=1;
 assert.throws(()=>analyzeLiveViewMatrix(changed),/Native view differs/);
 const setter=structuredClone(fixture.live);setter.find(r=>r.phase==='set-transform'&&r.transform===2).words[2]^=1;
 assert.throws(()=>analyzeLiveViewMatrix(setter),/View submission differs/);
 const world=structuredClone(fixture.live);world.filter(r=>r.phase==='set-transform'&&r.transform===256).forEach(r=>r.words[0]=0);
 assert.throws(()=>analyzeLiveViewMatrix(world),/Product inputs differ/);
 assert.throws(()=>analyzeLiveViewMatrix(fixture.live.filter(r=>r.phase!=='after-view')),/Unpaired camera entry|Incomplete camera pair/);
});
