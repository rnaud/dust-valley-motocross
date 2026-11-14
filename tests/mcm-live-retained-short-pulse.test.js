import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-short-pulse-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('upright acceleration and throttle-release retain matching physics for 400 calls',()=>{
 const f=fixture(),r=compare(f.input,f.rows,f.events);
 assert.equal(r.bikeFrames,400);assert.equal(r.riderTicks,399);assert.equal(r.comparedWords,842580);
 assert.equal(r.externalWords,7850325);assert.equal(r.physicsDifferences,0);
 assert.equal(r.particleDifferences,6343698);assert.equal(r.visualDifferences,6346860);
 assert.equal(r.pendingBikeFrame,null);assert.equal(r.pendingExternalTick,null);
 for(let frame=0;frame<400;frame++){
  assert.equal(f.rows[frame*2].requestedThrottle,+(frame<20));
  assert.equal(Buffer.from(f.rows[frame*2+1].stateHex,'hex').readUInt32LE(0x844),0);
 }
 const speed=frame=>Buffer.from(f.rows[frame*2+1].stateHex,'hex').readFloatLE(0x6a4);
 assert.ok(speed(19)>17&&speed(20)<speed(19)&&speed(399)<.01);
 // Shift the release edge: a wrong input history must fail at that frame.
 f.rows[40].requestedThrottle=1;
 const broken=compare(f.input,f.rows,f.events);
 assert.equal(broken.bikeFrames,21);assert.ok(broken.physicsDifferences>0);
});
