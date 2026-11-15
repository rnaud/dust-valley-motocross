import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {createCapturedFrameRuntime} from '../scripts/mcm-reference/captured-frame-runtime.mjs';
import {compareRenderSources} from '../scripts/mcm-reference/compare-render-sources.mjs';
function load(name){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/live-retained-${name}-wine11.json.br`,import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw);const n={...raw};cache.set(id,n);if(raw.children)n.children=new Proxy(raw.children,{get(t,k){assert.ok(Object.hasOwn(t,k));return node(t[k]);}});return n;};
 f.input.terrain={root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid};return f;
}
test('retained wrapper local matrix and animation bounds match moving positive steering sources',()=>{
 const f=load('steering'),r=compareRenderSources(f.input,f.rows,f.events);
 assert.deepEqual(r,{words:8822,differences:0,bikeSamples:400,riderSamples:1,firstDifferences:[],bikeFrames:400,physicsDifferences:0});
 // Native observations remain comparison targets, never replacement state.
 const b=Buffer.from(f.rows[3].matrixHex,'hex');b[0]^=1;f.rows[3].matrixHex=b.toString('hex');
 const changed=compareRenderSources(f.input,f.rows,f.events);assert.equal(changed.firstDifferences[0].frame,1);assert.ok(changed.differences>0);
});
test('retained render source comparison preserves the unresolved negative-steering divergence',()=>{
 const f=load('negative-steering'),r=compareRenderSources(f.input,f.rows,f.events);
 assert.equal(r.words,880);assert.equal(r.bikeSamples,39);assert.equal(r.riderSamples,1);assert.equal(r.differences,12);assert.equal(r.physicsDifferences,41);assert.ok(r.firstDifferences.every(d=>d.frame===38));
});

test('wrapper source reads local storage without resolving or changing transform caches',()=>{
 const f=load('steering'),runtime=createCapturedFrameRuntime(f.input,f.rows[0],f.events[0]);
 const node=runtime.loaded.visuals.rider.bodyNode;
 node.local[12]=123;node.world[12]=456;node.cacheValid=0;
 const before=structuredClone(node.world),source=runtime.renderSources()[1];
 assert.equal(source.local[12],123);assert.equal(node.cacheValid,0);assert.deepEqual(node.world,before);
 source.local[12]=789;assert.equal(node.local[12],123);
 const animation=runtime.loaded.context.frameRider.riderAnimation;animation.boundsMin[0]=17;
 assert.equal(runtime.renderSources()[1].center[0],17);
});
