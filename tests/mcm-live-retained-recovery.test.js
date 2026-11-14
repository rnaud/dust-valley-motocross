import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-recovery-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('retained original throttle, crash, recovery and release match modeled physics for 400 calls',()=>{
 const f=fixture(),r=compare(f.input,f.rows,f.events);
 assert.equal(r.bikeFrames,400);assert.equal(r.riderTicks,399);
 assert.equal(r.comparedWords,842700);assert.equal(r.externalWords,7850325);
 assert.equal(r.physicsDifferences,0);assert.equal(r.visualDifferences,6222982);
 assert.equal(r.particleDifferences,6219630);
 assert.equal(r.pendingBikeFrame,null);assert.equal(r.pendingExternalTick,null);
 const reset=f.rows[493];
 assert.equal(Buffer.from(f.rows[492].stateHex,'hex').readUInt32LE(0x844),1);
 assert.equal(Buffer.from(reset.stateHex,'hex').readUInt32LE(0x844),0);
 // A wrong native recovery callback must be exposed, not masked by unchanged bytes.
 const bytes=Buffer.from(reset.riderCollision.stateHex,'hex');bytes.writeUInt32LE(0x40bb20,0x108);reset.riderCollision.stateHex=bytes.toString('hex');
 const broken=compare(f.input,f.rows,f.events);
 assert.equal(broken.bikeFrames,247);assert.equal(broken.physicsDifferences,1);
 assert.deepEqual(broken.reports.at(-1).firstPhysicsDifferences,[{object:'rider-collision',field:'primary',original:0x40bb20,recovered:0x40b9e0}]);
});
test('recovery rejects missing atomic enumeration data',()=>{
 const f=fixture(),world=f.input.environment.blocks.find(b=>b.address===0x4e4fb4),address=Buffer.from(world.hex,'hex').readUInt32LE()+0x614;
 f.input.environment.blocks=f.input.environment.blocks.filter(b=>b.address!==address);
 f.input.environment.blockCount=f.input.environment.blocks.length;
 assert.throws(()=>compare(f.input,f.rows,f.events),/Missing checkpoint memory/);
});
