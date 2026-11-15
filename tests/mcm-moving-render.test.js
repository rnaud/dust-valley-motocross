import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {analyzeMovingRender} from '../scripts/mcm-reference/analyze-moving-render.mjs';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/moving-render-wine11.json.br',import.meta.url))));
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 f.input.terrain={root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};return f;
}
test('moving native trace matches retained bike and rider sources through actual drawing',()=>{
 const f=fixture(),r=analyzeMovingRender(f.input,f.rows,f.events,f.render);
 assert.equal(r.returnSamples,800);assert.equal(r.returnWords,17600);assert.equal(r.drawSamples,798);assert.equal(r.drawWords,17556);
 assert.equal(r.bikeFrames,400);assert.equal(r.riderTicks,399);assert.equal(r.poolTicks,399);assert.equal(r.physicsDifferences,0);
 assert.equal(r.visualDifferences,11224606);assert.equal(r.particleDifferences,11221535);
 assert.equal(r.storeCount,383);assert.equal(r.carryChecks,373);assert.equal(r.carryDifferences,59);assert.equal(r.multipleStoreFrames,10);
 assert.match(f.cleanup,/debugger=0 clean=1/);assert.equal((f.cleanup.match(/restored=1/g)||[]).length,15);assert.match(f.run,/captured=800 status=1/);
 assert.deepEqual(f.input.animations.unreadableRetainedFrames,[{index:4,token:0x3e31d0c8}]);
 for(let i=0;i<400;i++){assert.equal(f.rows[i*2].requestedThrottle,i<40?1:0);assert.equal(f.rows[i*2].requestedSteerBits,i>=20&&i<70?0xbe800000:0);}
 f.render.find(r=>r.phase==='wrapper').words[32]^=1;
 assert.throws(()=>analyzeMovingRender(f.input,f.rows,f.events,f.render),/draw-time source differs/);
});
