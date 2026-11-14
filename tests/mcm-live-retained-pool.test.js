import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-pool-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('retained bike/rider replay executes original pool ticks with captured timing and no output injection',()=>{
 const f=fixture(),r=compare(f.input,f.rows,f.events);
 assert.equal(r.bikeFrames,400);assert.equal(r.riderTicks,399);assert.equal(r.poolTicks,399);
 assert.equal(r.comparedWords,842700);assert.equal(r.externalWords,16248876);
 assert.equal(r.physicsDifferences,0);assert.equal(r.visualDifferences,9258639);assert.equal(r.particleDifferences,9255300);
 assert.equal(r.pendingBikeFrame,null);assert.equal(r.pendingExternalTick,null);
 assert.ok(f.events.filter(e=>e.phase==='before-pool').every(e=>!Object.hasOwn(e,'poolHex')&&!Object.hasOwn(e,'particlesHex')));
 assert.ok(f.events.some(e=>e.phase==='before-pool'&&e.dtBits!==1017370378));
 f.events.splice(3,2);assert.throws(()=>compare(f.input,f.rows,f.events),/world event sequence/);
});
