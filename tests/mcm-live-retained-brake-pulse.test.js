import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-brake-pulse-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('upright acceleration, brake ramp and brake release match the original for 400 calls',()=>{
 const f=fixture(),r=compare(f.input,f.rows,f.events);
 assert.equal(r.bikeFrames,400);assert.equal(r.riderTicks,399);assert.equal(r.physicsDifferences,0);
 assert.equal(r.pendingBikeFrame,null);assert.equal(r.pendingExternalTick,null);
 assert.ok(r.visualDifferences>0);assert.ok(r.particleDifferences>0);
 const value=(frame,offset)=>Buffer.from(f.rows[frame*2+1].stateHex,'hex').readFloatLE(offset);
 for(let frame=0;frame<400;frame++){
  assert.equal(f.rows[frame*2].requestedThrottle,+(frame<20));
  assert.equal(f.rows[frame*2].requestedBrake,+(frame>=20&&frame<80));
  assert.equal(Buffer.from(f.rows[frame*2+1].stateHex,'hex').readUInt32LE(0x844),0);
 }
 assert.equal(value(20,0x5e4),Math.fround(.2));assert.equal(value(24,0x5e4),1);
 assert.equal(value(80,0x5e4),.5);assert.equal(value(81,0x5e4),0);
 assert.ok(value(60,0x6a4)<.2);
 f.rows[40].requestedBrake=f.rows[41].requestedBrake=0;
 const broken=compare(f.input,f.rows,f.events);assert.equal(broken.bikeFrames,21);assert.ok(broken.physicsDifferences>0);
});
test('captured brake histories reject a missing response instead of carrying a stale value',()=>{
 const f=fixture();delete f.rows[40].requestedBrake;
 assert.throws(()=>compare(f.input,f.rows,f.events),/Missing retained brake input/);
});
