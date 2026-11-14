import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(name){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/live-retained-${name}-wine11.json.br`,import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
for(const [name,words]of [['short-pulse',856980],['recovery',857100]])test(`retained ${name} rider collider geometry matches 400 native updates`,()=>{
 const f=fixture(name);f.input.validateRiderCollider=true;
 const r=compare(f.input,f.rows,f.events);
 assert.equal(r.bikeFrames,400);assert.equal(r.riderTicks,399);assert.equal(r.comparedWords,words);assert.equal(r.physicsDifferences,0);
 const bytes=Buffer.from(f.rows[1].riderCollision.stateHex,'hex');bytes.writeUInt32LE(bytes.readUInt32LE(0x60)^1,0x60);f.rows[1].riderCollision.stateHex=bytes.toString('hex');
 const broken=compare(f.input,f.rows,f.events);assert.equal(broken.physicsDifferences,1);assert.equal(broken.reports[0].firstPhysicsDifferences[0].object,'rider-collider');assert.equal(broken.reports[0].firstPhysicsDifferences[0].offset,'60');
});
