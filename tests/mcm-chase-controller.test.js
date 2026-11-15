import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareChaseEntry} from '../scripts/mcm-reference/compare-chase-entry.mjs';
import {analyzeLiveChaseController} from '../scripts/mcm-reference/analyze-live-chase-controller.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-controller-wine11.json.br',import.meta.url))));
test('camera restore, yaw threshold and multiplier match 2560 original boundary cases',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareChaseEntry(input,output),{cases:2560,words:15360,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareChaseEntry(input,output).differences,1);assert.throws(()=>compareChaseEntry(input,output.subarray(0,-1)),/Incomplete/);
});
for(const [name,pairs] of [['idle',30],['pulse',160]])test(`retained joined controller matches ${pairs} original ${name} frames`,()=>{
 assert.deepEqual(analyzeLiveChaseController(fixture[name]),{pairs,downstreamWords:pairs*52,spatialWords:pairs*12,retainedTargetChecks:pairs,active:pairs,bypassed:0,resets:0,modes:[0]});
 assert.match(fixture.cleanup[name],/debugger=0 clean=1/);assert.equal((fixture.cleanup[name].match(/restored=1/g)||[]).length,8);
});
test('joined controller rejects dropped stages, external state changes and first initialization',()=>{
 const rows=fixture.pulse;
 assert.throws(()=>analyzeLiveChaseController(rows.slice(0,-1)),/Incomplete/);
 const dropped=structuredClone(rows);dropped.splice(3,1);assert.throws(()=>analyzeLiveChaseController(dropped),/Missing or reordered/);
 for(const [phase,index,message] of [['source-entry',74,/initialization/],['base-entry',30,/eye gate/],['before',31,/strictly equal/],['after',26,/camera state differs/]]){
  const changed=structuredClone(rows);const r=changed.find(r=>r.phase===phase);r.inputs[index]=(r.inputs[index]^1)>>>0;assert.throws(()=>analyzeLiveChaseController(changed),message);
 }
 const retained=structuredClone(rows);const r=retained.filter(r=>r.phase==='source-entry')[1];r.inputs[26]=(r.inputs[26]^1)>>>0;
 assert.throws(()=>analyzeLiveChaseController(retained),/Retained camera differs/);
 const target=structuredClone(rows);const t=target.filter(r=>r.phase==='base-entry')[1];t.result[0]=(t.result[0]^1)>>>0;
 assert.throws(()=>analyzeLiveChaseController(target),/Retained target differs/);
});
test('native pulse crosses the yaw gate after its pre-control decision',()=>{
 const f=n=>new Float32Array(Uint32Array.of(n).buffer)[0];let crossings=0;
 for(let i=0;i<fixture.pulse.length;i+=8){const base=fixture.pulse[i+3],heading=fixture.pulse[i+6];
  assert.equal(base.inputs[30],Math.abs(f(base.inputs[26]))>2?1:0);
  if((Math.abs(f(heading.inputs[26]))>2?1:0)!==heading.inputs[30])crossings++;
 }
 assert.equal(crossings,1);
});
