import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-steering-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('recorded steering input, neutral release and crash transitions match 400 original updates',()=>{
 const f=fixture(),r=compare(f.input,f.rows,f.events);
 assert.equal(r.bikeFrames,400);assert.equal(r.riderTicks,399);assert.equal(r.poolTicks,399);assert.equal(r.comparedWords,842655);assert.equal(r.externalWords,16248876);
 assert.equal(r.physicsDifferences,0);assert.equal(r.visualDifferences,9832174);assert.equal(r.particleDifferences,9828490);
 assert.equal(r.pendingBikeFrame,null);assert.equal(r.pendingExternalTick,null);
 for(let i=0;i<400;i++)assert.equal(f.rows[i*2].requestedSteerBits,i>=20&&i<70?0x3e800000:0);
 const bytes=i=>Buffer.from(f.rows[i*2+1].stateHex,'hex');
 assert.ok(bytes(20).readFloatLE(0x4e0)>bytes(19).readFloatLE(0x4e0));
 assert.equal(bytes(82).readUInt32LE(0x844),1);assert.equal(bytes(117).readUInt32LE(0x844),2);
 f.rows[40].requestedSteerBits=f.rows[41].requestedSteerBits=0;
 const wrong=compare(f.input,f.rows,f.events);assert.equal(wrong.bikeFrames,21);assert.ok(wrong.physicsDifferences>0);
 delete f.rows[40].requestedSteerBits;assert.throws(()=>compare(f.input,f.rows,f.events),/Missing retained steering input/);
});
