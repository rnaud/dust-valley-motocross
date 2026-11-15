import {loadLiveFrameBootstrap} from '../scripts/mcm-reference/live-frame-bootstrap.mjs';
import {checkpointMemory} from '../scripts/mcm-reference/live-checkpoint.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const fixture=(name='ai-substeps')=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));
function input(f=fixture()){
 const json=name=>JSON.parse(f.files[name+'.json']),rows=f.files['frames.jsonl'].trim().split('\n').map(JSON.parse);
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {checkpoint:json('checkpoint'),animations:json('animations'),environment:json('environment'),collision:json('collision'),aiEnvironment:json('ai-environment'),row:rows.find(r=>r.phase==='before-update'),terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale},throttle:0,brake:0,rows};
}
import {analyzeAiSubsteps} from '../scripts/mcm-reference/analyze-ai-substeps.mjs';
const trace=f=>f.files['substeps.jsonl'].trim().split('\n').map(JSON.parse);
const rider=f=>f.files['rider.jsonl'].trim().split('\n').map(JSON.parse);
test('eight retained original AI frames match every observed substep body and component word',()=>{
 const f=fixture();for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,17);
 const i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,8);assert.deepEqual(r.substeps,Array(8).fill(11));
 assert.equal(r.substepBoundaries,478);assert.equal(r.substepBodyBytes,478*0xcc8);assert.equal(r.componentWords,478*12);assert.equal(r.controlSkipped,50);
 assert.equal(r.bodyBoundaries,32);assert.equal(r.randomDraws,5);assert.equal(r.visualDifferences.length,0);
 assert.equal(r.riderBytes,35000);assert.equal(r.particleDifferences.length,107874);
});
test('substep comparison rejects changed intermediate body and suspension outputs',()=>{
 for(const kind of ['body','component']){
  const f=fixture(),i=input(f),rows=trace(f),row=rows.find(r=>r.frame===1&&r.phase==='tires');
  const bike=row.blocks.find(b=>b.address===row.bike),address=kind==='body'?row.bike:Buffer.from(bike.hex,'hex').readUInt32LE(0x8e4);
  const block=row.blocks.find(b=>b.address===address),bytes=Buffer.from(block.hex,'hex');bytes[kind==='body'?0x510:0x5c]^=1;block.hex=bytes.toString('hex');
  assert.throws(()=>analyzeAiSubsteps(i,i.rows,rider(f),rows),kind==='body'?/step 0 tires body 510/:/step 0 tires component 8e4\+5c/);
 }
});
test('substep comparison rejects missing boundaries and invented control visits',()=>{
 for(const kind of ['missing','invented','identity']){
  const f=fixture(),i=input(f),rows=trace(f);
  if(kind==='missing')rows.splice(rows.findIndex(r=>r.phase==='motion'),1);
  else if(kind==='identity')rows[0].captureId='different-capture';
  else{
   const index=rows.findIndex((r,j)=>r.phase==='rider'&&rows[j-1].phase==='motion');assert.ok(index>0);
   rows.splice(index,0,{...rows[index],phase:'controls'});
  }
  assert.throws(()=>analyzeAiSubsteps(i,i.rows,rider(f),rows));
 }
});
test('airborne redirection uses the component cached basis across retained trick frames',()=>{
 const f=fixture('ai-substeps-control-source');for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 const i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,4);assert.deepEqual(r.substeps,[11,11,10,11]);assert.equal(r.substepBoundaries,237);
 assert.equal(r.componentWords,2844);assert.equal(r.bodyBoundaries,16);assert.deepEqual(r.visualDifferences,[]);
 assert.equal(r.particleDifferences.length,7412);
 const loaded=loadLiveFrameBootstrap(i),c=loaded.context,m=checkpointMemory(i.checkpoint);
 assert.equal(c.baseNode.address,m.u32(m.u32(i.checkpoint.bikeAddress+0x8d8)));assert.notEqual(c.baseNode,c.bodyNode);
 assert.equal(c.baseNode,c.aiController.runtime.setup.graph.source);
});
