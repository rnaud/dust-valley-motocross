import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-rider-prefix-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('retained bike and external rider ticks match until the first free-rider integration dependency',()=>{
 const f=fixture(),r=compare(f.input,f.rows,f.events);
 assert.equal(r.bikeFrames,121);assert.equal(r.riderTicks,120);
 assert.equal(r.comparedWords,415277);assert.equal(r.externalWords,74880);
 assert.equal(r.physicsDifferences,0);assert.equal(r.visualDifferences,525);
 assert.deepEqual(r.pendingExternalTick,{frame:120,reason:'Free-rider integration is not connected'});
 assert.equal(r.reports[51].visualDifferences,3);
});
test('retained validation detects changed input and missing external rider ticks',()=>{
 const f=fixture(),rows=structuredClone(f.rows);rows[100].requestedThrottle=0;
 const changed=compare(f.input,rows,f.events);
 assert.ok(changed.physicsDifferences>0);assert.equal(changed.reports.at(-1).frame,50);
 const events=f.events.filter(e=>e.phase==='initial-rider'||e.frame!==0);
 assert.throws(()=>compare(f.input,f.rows,events),/Missing or repeated external rider tick/);
 const altered=structuredClone(f.events);altered[2].globalDtBits=0;
 assert.ok(compare(f.input,f.rows,altered).physicsDifferences>0);
});
