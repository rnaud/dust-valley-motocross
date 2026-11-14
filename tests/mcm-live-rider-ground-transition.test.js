import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRiderTick} from '../scripts/mcm-reference/compare-live-rider-tick.mjs';
import {loadLiveRiderTick} from '../scripts/mcm-reference/live-rider-tick.mjs';
import {advanceMcmRiderTick} from '../src/physics/mcm/rider-tick.js';
import {floatBits} from '../src/physics/mcm/math.js';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-rider-ground-transition-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,terrain:{...f.terrain,root:node(f.terrain.root)}};
}
test('first rider ground contact preserves the native joint pose, world state and callback effects',()=>{
 const f=fixture(),c=f.cases[0],r=compareLiveRiderTick(c.before,c.after,f.terrain);
 assert.equal(r.frame,119);assert.equal(r.comparedWords,160110);assert.equal(r.changedWords,438);assert.deepEqual(r.differences,[]);
 assert.deepEqual(r.callbackTrace,[[85841456,2],[85756408,1]]);
 const loaded=loadLiveRiderTick({...c.before,terrain:f.terrain});advanceMcmRiderTick(loaded.context,loaded.dt);
 assert.equal(loaded.context.rider.field140,0);assert.equal(loaded.context.rider.field138,1);assert.equal(loaded.context.rider.field39c,0);
 assert.deepEqual(loaded.context.collider.callbackAddresses,[0x40bb20,0x40bb30]);
 c.before.child.dtBits=c.after.child.dtBits=floatBits(.01);
 assert.ok(compareLiveRiderTick(c.before,c.after,f.terrain).differences.length>0);
});
