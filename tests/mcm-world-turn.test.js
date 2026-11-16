import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadLiveAnimationAssets} from '../scripts/mcm-reference/animation-assets-loader.mjs';
import {createWorldBikeRuntime} from '../scripts/mcm-reference/world-bike-runtime.mjs';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-turn-wine11.json.br',import.meta.url))));
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}
test('native steering sequence matches both retained bikes and shared animation state',()=>{
 for(const [name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,46);assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
 const rows=fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse),inputs=rows.filter(r=>r.frameInput).map(r=>r.frameInput.steerBits);
 assert.equal(inputs.length,32);assert.ok(new Set(inputs).size>1);assert.ok(inputs.every(v=>v!==0));
 const result=analyzeWorldBikes(fixture.files,terrain(),{renderCameraInputs:true});
 assert.equal(result.reports.length,32);assert.equal(result.worldRiderReports.length,60);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});
test('two bike animation loaders preserve shared mutable child identity and reject conflicting initialization',()=>{
 const a=JSON.parse(fixture.files['world-animations-0.json']),b=JSON.parse(fixture.files['world-animations-1.json']),sharedChildren=new Map();
 const first=loadLiveAnimationAssets(a,{sharedChildren}),second=loadLiveAnimationAssets(b,{sharedChildren});
 const address=0x198da60,child=first.children.get(address);assert.ok(child);assert.equal(second.children.get(address),child);
 child.forward[0]=.25;assert.equal(second.children.get(address).forward[0],.25);
 const block=b.blocks.find(b=>b.address===address),bytes=Buffer.from(block.hex,'hex');bytes.writeUInt32LE(bytes.readUInt32LE(8)^1,8);block.hex=bytes.toString('hex');
 assert.throws(()=>loadLiveAnimationAssets(b,{sharedChildren}),/Shared animation child initial bytes differ/);
});
test('frame input adapter rejects nonfinite controls and malformed device state',()=>{
 const runtime=createWorldBikeRuntime(fixture.files,terrain(),{throttle:0,brake:0}),address=runtime.world.entry.bikes[0],input={...runtime.bikes.get(address).loaded.input};
 assert.throws(()=>runtime.setFrameInput(address,{...input,steerBits:0x7fc00000}),/Invalid world frame input/);
 assert.throws(()=>runtime.setFrameInput(address,{...input,deviceByte:256}),/Invalid world input device/);
 assert.throws(()=>runtime.setFrameInput(1,input),/Unknown world input bike/);
});
