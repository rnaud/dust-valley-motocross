import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedRiderFrames as compare} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-early-throttle-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('immediate throttle retains matching physics until the explicit recovery dependency',()=>{
 const f=fixture(),r=compare(f.input,f.rows,f.events);
 assert.equal(r.bikeFrames,246);assert.equal(r.riderTicks,246);assert.equal(r.comparedWords,606096);assert.equal(r.externalWords,4840050);
 assert.equal(r.physicsDifferences,0);assert.equal(r.visualDifferences,3936453);assert.equal(r.particleDifferences,3933836);
 assert.deepEqual(r.pendingBikeFrame,{frame:246,reason:'Unmapped live frame dependency: context.restoreRiderVisual'});
 assert.equal(r.pendingExternalTick,null);assert.equal(f.rows[0].requestedThrottle,1);
 f.rows[0].requestedThrottle=0;assert.ok(compare(f.input,f.rows,f.events).physicsDifferences>0);
});
