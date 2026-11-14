import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-negative-steering-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('opposite steering exposes the caller-scratch boundary rather than silently reseeding it',()=>{
 const f=fixture(),r=compare(f.input,f.rows,f.events);
 assert.equal(r.callerScratchMode,'retained');assert.equal(r.observedCallerScratchWords,0);
 assert.equal(r.bikeFrames,39);assert.equal(r.reports.at(-1).frame,38);assert.equal(r.physicsDifferences,41);
 const before=Buffer.from(f.rows[76].stackHex,'hex'),after=Buffer.from(f.rows[77].stackHex,'hex');
 assert.equal(before.readUInt32LE(0x54),0);assert.equal(after.readUInt32LE(0x54),0);
 const conditional=compare(f.input,f.rows,f.events,{observedCallerDriveScratch:true});
 assert.equal(conditional.callerScratchMode,'observed-input');assert.equal(conditional.observedCallerScratchWords,400);
 assert.equal(conditional.bikeFrames,400);assert.equal(conditional.riderTicks,399);assert.equal(conditional.poolTicks,399);assert.equal(conditional.physicsDifferences,0);
 assert.equal(conditional.comparedWords,842676);assert.equal(conditional.visualDifferences,9303810);
 assert.match(conditional.scope,/not fully retained caller\/world state/);
});
