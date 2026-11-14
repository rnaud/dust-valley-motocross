import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {loadLiveFrameBootstrap} from '../scripts/mcm-reference/live-frame-bootstrap.mjs';
import {compareLiveFrameTires,compareLiveFrameMotion,compareLiveFrameControls} from '../scripts/mcm-reference/compare-live-frame-tires.mjs';
import {advanceMcmRetainedFrame} from '../src/physics/mcm/retained-frame.js';
function fixture(boundary='tires'){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/live-frame-${boundary}-wine11.json.br`,import.meta.url)))),cache=new Map();
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
 assert.throws(()=>advanceMcmRetainedFrame(c,{delta:Math.fround(.02),mode:loaded.mode,input:loaded.input}),/Unmapped live frame dependency: contactPhase.normalEventDecision/);
});
test('connected tire comparison rejects a whole-frame endpoint or absent explicit digital inputs',()=>{
 const f=fixture();assert.throws(()=>compareLiveFrameTires(f.input,{...f.after,phase:'after-update'}),/boundary differs/);
 assert.throws(()=>loadLiveFrameBootstrap({...f.input,throttle:undefined}),/Explicit digital/);
 const bad={...f.input.environment,captureId:'0123456789abcdef'};
 assert.throws(()=>loadLiveFrameBootstrap({...f.input,environment:bad}),/boundary differs/);
});

test('connected motion prefix matches bike, engine and body transform observations',()=>{
 const f=fixture('motion'),report=compareLiveFrameMotion(f.input,f.after);
 assert.equal(report.comparedWords,925);assert.equal(report.changedWords,24);assert.equal(report.differences,0);
 assert.equal(report.stages.at(-1),'motion');assert.equal(report.frontContact,1);assert.equal(report.rearContact,1);
 const raw=Buffer.from(f.after.matrixHex,'hex');raw.writeUInt32LE(raw.readUInt32LE(48)^1,48);
 const different=compareLiveFrameMotion(f.input,{...f.after,matrixHex:raw.toString('hex')});
 assert.equal(different.differences,1);assert.equal(different.firstDifferences[0].object,'body-local-matrix');
});

test('connected control boundary matches original bike, controller, engine and body state',()=>{
 const f=fixture('controls'),report=compareLiveFrameControls(f.input,f.after);
 assert.equal(report.comparedWords,1160);assert.equal(report.changedWords,24);assert.equal(report.differences,0);
 assert.equal(report.stages.at(-1),'controls');
 const raw=Buffer.from(f.after.riderHex,'hex');raw.writeUInt32LE((raw.readUInt32LE(0x70)^1)>>>0,0x70);
 const mismatch=compareLiveFrameControls(f.input,{...f.after,riderHex:raw.toString('hex')});
 assert.equal(mismatch.differences,1);assert.equal(mismatch.firstDifferences[0].object,'rider-controller');
 assert.throws(()=>compareLiveFrameControls(f.input,{...f.after,phase:'after-motion'}),/boundary differs/);
});
