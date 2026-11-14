import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRetainedFrames} from '../scripts/mcm-reference/compare-live-retained-frames.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-throttle-prefix-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('retained captured frames reach throttle onset without reloading modeled state',()=>{
 const f=fixture(),report=compareLiveRetainedFrames(f.input,f.rows.slice(0,102));
 assert.equal(report.frames,51);assert.equal(report.comparedWords,186897);assert.equal(report.differences,0);
 assert.equal(f.rows[100].requestedThrottle,1);assert.equal(f.rows[98].requestedThrottle,0);
 const altered=structuredClone(f.rows.slice(0,102));altered[100].requestedThrottle=0;
 assert.ok(compareLiveRetainedFrames(f.input,altered).differences>0,'Driver input must reach the retained engine');
});
test('retained validation exposes external emitter updates instead of copying them',()=>{
 const f=fixture(),report=compareLiveRetainedFrames(f.input,f.rows),last=report.reports.at(-1);
 assert.equal(report.frames,52);assert.equal(last.frame,51);assert.equal(last.differences,3);
 assert.deepEqual(last.firstDifferences.map(d=>[d.object,d.offset]),[['visual-emitter-2','48'],['visual-emitter-2','68'],['visual-emitter-2','478']]);
 const rows=structuredClone(f.rows);rows[2].playerFrame=7;
 assert.throws(()=>compareLiveRetainedFrames(f.input,rows),/sequence differs/);
});
