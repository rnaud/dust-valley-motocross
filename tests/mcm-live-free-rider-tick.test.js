import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRiderTick} from '../scripts/mcm-reference/compare-live-rider-tick.mjs';
import {loadLiveRiderTick} from '../scripts/mcm-reference/live-rider-tick.mjs';
import {advanceMcmRiderTick} from '../src/physics/mcm/rider-tick.js';
import {floatBits} from '../src/physics/mcm/math.js';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-free-rider-tick-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,terrain:{...f.terrain,root:node(f.terrain.root)}};
}
test('free-rider motion and contact impulse match the complete original tick',()=>{
 const f=fixture(),c=f.cases[0],r=compareLiveRiderTick(c.before,c.after,f.terrain);
 assert.equal(r.frame,120);assert.equal(r.comparedWords,264335);assert.equal(r.changedWords,386);assert.deepEqual(r.differences,[]);
 assert.deepEqual(r.callbackTrace,[]);
 const loaded=loadLiveRiderTick({...c.before,terrain:f.terrain});advanceMcmRiderTick(loaded.context,loaded.dt);
 assert.equal(loaded.context.rider.field144,1);assert.equal(loaded.context.rider.field148,1);assert.equal(loaded.context.rider.field14c,0);
 assert.equal(loaded.childBytes.readUInt32LE(0x64),1);assert.equal(loaded.context.animation.blending,1);
 c.before.child.dtBits=c.after.child.dtBits=floatBits(.01);
 assert.ok(compareLiveRiderTick(c.before,c.after,f.terrain).differences.length>0);
});
test('free-rider integration requires captured damping and contact animation dependencies',()=>{
 const f=fixture(),c=f.cases[0];
 const missing=loadLiveRiderTick({...c.before,terrain:f.terrain});missing.context.damping=undefined;
 assert.throws(()=>advanceMcmRiderTick(missing.context,missing.dt),/Free-rider integration is not connected/);
 const assets=loadLiveRiderTick({...c.before,terrain:f.terrain});assets.assets.records.length=0;
 assert.throws(()=>advanceMcmRiderTick(assets.context,assets.dt),/Missing free-rider contact animation/);
});
