import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRiderTick} from '../scripts/mcm-reference/compare-live-rider-tick.mjs';
import {loadLiveRiderTick} from '../scripts/mcm-reference/live-rider-tick.mjs';
import {advanceMcmRiderTick} from '../src/physics/mcm/rider-tick.js';
import {floatBits} from '../src/physics/mcm/math.js';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-rider-tick-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,terrain:{...f.terrain,root:node(f.terrain.root)}};
}
test('separate crash rider ticks match original world, animations and child state',()=>{
 const f=fixture(),reports=f.cases.map(c=>compareLiveRiderTick(c.before,c.after,f.terrain));
 assert.deepEqual(reports.map(r=>r.frame),[104,105]);assert.equal(reports.reduce((n,r)=>n+r.comparedWords,0),320799);assert.equal(reports.reduce((n,r)=>n+r.changedWords,0),776);
 for(const r of reports){assert.equal(r.result,1);assert.deepEqual(r.callbackTrace,[]);assert.deepEqual(r.differences,[]);}
 const c=f.cases[1];c.before.child.dtBits=c.after.child.dtBits=floatBits(.01);
 assert.ok(compareLiveRiderTick(c.before,c.after,f.terrain).differences.length>0,'Separate rider delta must reach animation and child updates');
});
test('rider tick refuses missing assets and unsupported child/free-rider branches',()=>{
 const f=fixture(),c=f.cases[0],original=c.before.animations.additionalRecords;
 c.before.animations.additionalRecords=[];assert.throws(()=>loadLiveRiderTick({...c.before,terrain:f.terrain}),/Unreferenced|Missing/);c.before.animations.additionalRecords=original;
 c.before.child.ownerGate=1;assert.throws(()=>loadLiveRiderTick({...c.before,terrain:f.terrain}),/child update branch/);c.before.child.ownerGate=0;
 const loaded=loadLiveRiderTick({...c.before,terrain:f.terrain});loaded.childBytes.writeUInt32LE(1,0x64);assert.throws(()=>advanceMcmRiderTick(loaded.context,loaded.dt),/particle pool/);
 const free=loadLiveRiderTick({...c.before,terrain:f.terrain});free.context.rider.flag13c=0;free.context.rider.field140=0;free.context.rider.field138=1;assert.throws(()=>advanceMcmRiderTick(free.context,free.dt),/Free-rider integration/);
});
