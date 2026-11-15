import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {drawMcmChildren} from '../src/physics/mcm/child-draw.js';
import {predictMcmSceneActors} from '../src/physics/mcm/scene-actor-draws.js';
import {analyzeSceneActorDraws} from '../scripts/mcm-reference/analyze-scene-actor-draws.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}.json.br`,import.meta.url))));
test('original child traversal matches removal, enable and early-return combinations',()=>{
 const f=read('child-draw-wine11'),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');assert.equal(input.length,4681*20);assert.equal(output.length,4681*72);
 const lengths=new Set(),returns=new Set(),types=new Set();
 for(let i=0;i<4681;i++){
  const a=Array.from({length:5},(_,j)=>input.readUInt32LE(i*20+j*4)),nodes=Array.from({length:a[0]},(_,j)=>({id:j,removed:a[j+1]&1,enabled:a[j+1]&2,result:Number(!!(a[j+1]&4))}));
  nodes.forEach((n,j)=>n.next=nodes[j+1]??null);const events=[],record=(kind,n)=>{events.push(kind,n.id);types.add(kind);};
  const result=drawMcmChildren({child:nodes[0]??null},{unlink:n=>record(1,n),destroy:n=>record(2,n),draw:n=>(record(3,n),n.result)});
  const words=[result,events.length/2,...events];while(words.length<18)words.push(0);
  assert.deepEqual(words,Array.from({length:18},(_,j)=>output.readUInt32LE(i*72+j*4)),`case ${i}`);lengths.add(a[0]);returns.add(result);
 }
 assert.equal(lengths.size,5);assert.equal(returns.size,2);assert.equal(types.size,3);
});
test('retained scene hierarchy predicts actor order, root stack depth and application addresses',()=>{
 const f=read('scene-actor-draws-wine11'),r=analyzeSceneActorDraws(f.rows,f.ownerDrawTarget);
 assert.deepEqual([r.seededNodes,r.comparedNodes,r.completeFrames,r.pendingFrames,r.warmupWrappers,r.derivedApplications],[76,228,3,1,4,6]);
 assert.equal(r.callbacksChecked,198);
 assert.equal(r.reports.reduce((n,f)=>n+f.wrappers.length,0),12);assert.equal(new Set(r.reports.flatMap(f=>f.opaque.map(c=>c.target))).size,10);
 assert.match(r.scope,/No full scene execution claim/);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,174);
});
test('later hierarchy snapshots and observed wrapper calls cannot silently reseed the scene',()=>{
 const mutations=[
  f=>{f.rows.find(r=>r.phase==='scene-node-input'&&r.frame===2).enabled^=1;},
  f=>{f.rows.find(r=>r.phase==='wrapper'&&r.frame===1).esp+=4;},
  f=>{const i=f.rows.findIndex(r=>r.phase==='wrapper'&&r.frame===1);f.rows.splice(i,1);},
  f=>{f.rows.find(r=>r.phase==='state-1bd500'&&r.frame===1&&r.actor).esp+=4;},
  f=>{f.rows.find(r=>r.phase==='child-after'&&r.frame===1).result=0;},
  f=>{f.ownerDrawTarget+=4;}
 ];
 for(const mutate of mutations){const f=read('scene-actor-draws-wine11');mutate(f);assert.throws(()=>analyzeSceneActorDraws(f.rows,f.ownerDrawTarget));}
});
test('unsupported callbacks with actor descendants and disabled-node cycles remain explicit failures',()=>{
 const root={address:1,target:0x4206c0,child:2,next:0,enabled:1,removed:0},child={address:2,target:0x123456,child:3,next:0,enabled:1,removed:0},actor={address:3,target:0x44faf0,child:0,next:0,enabled:1,removed:0};
 const nodes=new Map([root,child,actor].map(n=>[n.address,n])),run=()=>predictMcmSceneActors({root:1,nodes,worldEntryEsp:0x10000,ownerDrawTarget:0x467a90,opaqueDraw:()=>1});
 assert.throws(run,/Unmodeled callback owns actor descendants/);child.child=0;child.next=2;child.enabled=0;assert.throws(run,/Cyclic child list/);
});
