import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {loadLiveFrameBootstrap} from '../scripts/mcm-reference/live-frame-bootstrap.mjs';
import {compareLiveFrameTires} from '../scripts/mcm-reference/compare-live-frame-tires.mjs';
import {advanceMcmRetainedFrame} from '../src/physics/mcm/retained-frame.js';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-frame-tires-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unrecorded terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error(`Unrecorded terrain edge ${id}:${String(key)}`);return node(target[key]);}});
  return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('connected captured frame matches original bike state at tire accumulation',()=>{
 const f=fixture(),report=compareLiveFrameTires(f.input,f.after);
 assert.equal(report.comparedWords,818);assert.equal(report.changedWords,14);assert.equal(report.differences,0);
 assert.deepEqual(report.stages,['entry','recovery','input','steering','reset','terrain','engine','contact','response','tires']);
 assert.equal(report.frontContact,1);assert.equal(report.rearContact,1);
});
test('frame bootstrap shares transform identities and fails at uninitialized continuation',()=>{
 const {input}=fixture(),loaded=loadLiveFrameBootstrap(input),c=loaded.context;
 assert.equal(c.bodyNode,loaded.visuals.bike.bodyNode);
 assert.equal(c.bodyNode,loaded.world.transformNodes.get(c.bodyNode.address));
 assert.equal(c.frameRider.bodyNode,c.bodyNode);
 assert.equal(Object.hasOwn(c.frameRider,'bike'),false);
 assert.equal(c.engineEntry.engine,c.engine);
 assert.equal(c.engineEntry.suspension,c.suspension);
 assert.equal(c.contactPhase.bodyNode,c.bodyNode);
 assert.throws(()=>advanceMcmRetainedFrame(c,{delta:Math.fround(.02),mode:loaded.mode,input:loaded.input}),/Unmapped live frame dependency: contactPhase.chassisResponse/);
});
test('connected tire comparison rejects a whole-frame endpoint or absent explicit digital inputs',()=>{
 const f=fixture();assert.throws(()=>compareLiveFrameTires(f.input,{...f.after,phase:'after-update'}),/boundary differs/);
 assert.throws(()=>loadLiveFrameBootstrap({...f.input,throttle:undefined}),/Explicit digital/);
 const bad={...f.input.environment,captureId:'0123456789abcdef'};
 assert.throws(()=>loadLiveFrameBootstrap({...f.input,environment:bad}),/boundary differs/);
});
