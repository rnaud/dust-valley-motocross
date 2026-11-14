import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRiderTick} from '../scripts/mcm-reference/compare-live-rider-tick.mjs';
import {loadLiveRiderTick} from '../scripts/mcm-reference/live-rider-tick.mjs';
import {advanceMcmRiderTick} from '../src/physics/mcm/rider-tick.js';
import {floatBits} from '../src/physics/mcm/math.js';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-rider-particles-crossfade-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,terrain:{...f.terrain,root:node(f.terrain.root)}};
}
test('active particles, crossfade and free-rider physics match complete original ticks',()=>{
 const f=fixture(),reports=f.cases.map(c=>compareLiveRiderTick(c.before,c.after,f.terrain));
 assert.deepEqual(reports.map(r=>r.frame),[121,122]);assert.equal(reports.reduce((n,r)=>n+r.comparedWords,0),566772);assert.equal(reports.reduce((n,r)=>n+r.changedWords,0),878);
 for(const r of reports)assert.deepEqual(r.differences,[]);
 for(const c of f.cases){const loaded=loadLiveRiderTick({...c.before,terrain:f.terrain}),count=loaded.poolBytes.readUInt32LE(0x30);advanceMcmRiderTick(loaded.context,loaded.dt);assert.equal(loaded.poolBytes.readUInt32LE(0x30),count+2);assert.equal(loaded.context.animation.blending,1);}
 const c=f.cases[0];c.before.child.dtBits=c.after.child.dtBits=floatBits(.01);
 assert.ok(compareLiveRiderTick(c.before,c.after,f.terrain).differences.length>0);
});
test('live active particles reject missing pools and mismatched allocation ownership',()=>{
 const f=fixture(),c=f.cases[0],wrong=structuredClone(c.before);wrong.child.poolAddress++;
 assert.throws(()=>loadLiveRiderTick({...wrong,terrain:f.terrain}),/Invalid rider particle pool capture/);
 for(const k of ['poolAddress','poolHex','particlesHex'])delete c.before.child[k];
 const missing=loadLiveRiderTick({...c.before,terrain:f.terrain});
 assert.throws(()=>advanceMcmRiderTick(missing.context,missing.dt),/captured particle pool/);
});
