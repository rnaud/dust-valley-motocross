import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-draws-wine11.json.br',import.meta.url))));
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}
test('both bike/rider meshes are captured atomically before physics with verified cleanup',()=>{
 for(const [name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const entry=JSON.parse(fixture.files['world-entry.json']);
 for(let i=0;i<2;i++){
  const rows=fixture.files[`world-mesh-${i}.jsonl`].trim().split('\n').map(JSON.parse);assert.equal(rows.length,2);
  assert.equal(rows[0].actor,entry.bikes[i]);
  for(const row of rows){assert.equal(row.captureId,entry.captureId);assert.equal(row.captureBoundary,'world-frame-entry');assert.ok(row.blocks.length>2);assert.ok(row.lodNodes.length);}
 }
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,46);assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
});
test('initial mesh resources close body and visual differences through four retained bike pairs with external camera inputs',()=>{
 const result=analyzeWorldBikes(fixture.files,terrain(),{renderCameraInputs:true});
 assert.equal(result.reports.length,8);assert.equal(result.collisionReports.length,7);assert.equal(result.riderReports.length,3);assert.equal(result.visualReports.length,7);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 assert.equal(result.entryReports.length,8);
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
 assert.equal(result.worldRiderReports.length,12);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 assert.equal(result.sceneReports.length,3);
 assert.equal(result.drawReports.length,12);assert.ok(result.drawReports.some(r=>r.queries>0));
 // Draw invocation and camera inputs remain external; this is not a full
 // recovered world/render loop or normal-rate gameplay validation.
});
test('world mesh replay rejects changed native draw results instead of importing them',()=>{
 const files={...fixture.files},rows=files['world-draws.jsonl'].trim().split('\n').map(JSON.parse);
 rows.find(r=>r.phase==='after-draw').rect[0]^=1;files['world-draws.jsonl']=rows.map(JSON.stringify).join('\n');
 assert.throws(()=>analyzeWorldBikes(files,terrain(),{renderCameraInputs:true}),/Computed world draw bounds\/detail differ/);
});
