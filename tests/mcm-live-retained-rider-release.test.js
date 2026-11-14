import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-rider-release-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('retained modeled physics matches the complete captured crash and throttle-release history',()=>{
 const f=fixture(),r=compare(f.input,f.rows,f.events);
 assert.equal(r.bikeFrames,400);assert.equal(r.riderTicks,399);assert.equal(r.comparedWords,841130);assert.equal(r.externalWords,7850325);
 assert.equal(r.physicsDifferences,0);assert.equal(r.pendingExternalTick,null);
 assert.equal(r.particleComparedWords,7600551);assert.equal(r.particleDifferences,2061978);assert.equal(r.visualDifferences,2065866);
 assert.equal(f.rows[398].requestedThrottle,1);assert.equal(f.rows[400].requestedThrottle,0);
 // A native output change must remain visible, including the reset contact class.
 const row=f.rows[243],bytes=Buffer.from(row.riderHex,'hex');bytes.writeUInt32LE(3,0x154);row.riderHex=bytes.toString('hex');
 const altered=compare(f.input,f.rows.slice(0,244),f.events.filter(e=>e.frame<122));
 assert.equal(altered.physicsDifferences,1);assert.equal(altered.reports.at(-1).firstPhysicsDifferences[0].offset,'154');
});
