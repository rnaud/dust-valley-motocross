import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareChaseSpatial} from '../scripts/mcm-reference/compare-chase-spatial.mjs';
import {analyzeLiveChaseSpatialChain} from '../scripts/mcm-reference/analyze-live-chase-spatial-chain.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-spatial-wine11.json.br',import.meta.url))));
for(const [kind,cases] of [['source',768],['base',1536]])test(`${kind} construction matches original native boundary cases`,()=>{
 const input=Buffer.from(fixture[`${kind}InputHex`],'hex'),output=Buffer.from(fixture[`${kind}OutputHex`],'hex');
 assert.deepEqual(compareChaseSpatial(kind,input,output),{cases,words:cases*4,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareChaseSpatial(kind,input,output).differences,1);
 assert.throws(()=>compareChaseSpatial(kind,input,output.subarray(0,-1)),/Incomplete/);
});
test('computed source/base reach retained heading chain in the same native frames',()=>{
 assert.deepEqual(analyzeLiveChaseSpatialChain(fixture.live),{pairs:30,downstreamWords:1560,spatialWords:360,retainedTargetChecks:29,active:30,bypassed:0,resets:0,modes:[0]});
 for(const [phase,field,index,pattern] of [
  ['source-exit','inputs',13,/Native source differs/],
  ['base-exit','inputs',0,/Native base differs/],
  ['before','inputs',13,/Source differs before heading/],
  ['before','inputs',0,/Base differs before heading/],
  ['after','result',0,/Native result differs/],
 ]){
  const rows=structuredClone(fixture.live);rows.find(r=>r.phase===phase)[field][index]^=1;
  assert.throws(()=>analyzeLiveChaseSpatialChain(rows),pattern);
 }
 const retained=structuredClone(fixture.live);retained.filter(r=>r.phase==='base-entry')[1].result[0]^=1;
 assert.throws(()=>analyzeLiveChaseSpatialChain(retained),/Retained target differs at base entry/);
 const state=structuredClone(fixture.live);state.filter(r=>r.phase==='before')[1].filters[0]^=1;
 assert.throws(()=>analyzeLiveChaseSpatialChain(state),/Retained filters differ/);
 assert.throws(()=>analyzeLiveChaseSpatialChain(fixture.live.slice(0,-1)),/Incomplete/);
 const reordered=structuredClone(fixture.live);[reordered[1],reordered[2]]=[reordered[2],reordered[1]];
 assert.throws(()=>analyzeLiveChaseSpatialChain(reordered),/Missing or reordered/);
});
