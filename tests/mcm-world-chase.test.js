import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
import {validateWorldInputProtocol} from '../scripts/mcm-reference/world-input-protocol.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-chase-wine11.json.br',import.meta.url))));
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true};
test('retained bikes drive chase camera, audio position and drawing projection in native scene order',()=>{
 for(const [name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,49);assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
 const frames=fixture.provenance.retainedRows['frames.jsonl'].selected,result=analyzeWorldBikes(fixture.files,terrain(),options);
 assert.equal(frames,64);
 assert.deepEqual(validateWorldInputProtocol(fixture.files).frames.map(r=>r.throttle),[...Array(12).fill(1),...Array(52).fill(0)]);
 assert.deepEqual(result.chaseReport,{frames:frames-1,words:(frames-1)*150,intermediateEvolutionInputs:0,tailControlAssertions:frames-1,comparedInputWords:frames*24,target:JSON.parse(fixture.files['world-entry.json']).bikes[1]});
 for(const list of ['reports','entryReports','collisionReports','riderReports','visualReports','markerReports','hudReports']){
  assert.ok(result[list].length);for(const report of result[list]){assert.deepEqual(report.differences,[]);if(report.random)assert.equal(report.random.actual,report.random.expected);}
 }
 assert.equal(result.worldRiderReports.length,252);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 assert.ok(result.particleReports.length);assert.ok(result.particleReports.every(r=>r.differences===0));
 for(const report of result.sceneChildReports)assert.deepEqual(report.externalActors.map(a=>a.update),[0x43e660,0x411000,0x423b50,0x4253e0]);
 assert.equal(result.reports.length,frames*2);assert.equal(result.sceneChildReports.length,frames-1);
});
test('joined chase rejects missing scheduling and altered camera assertions',()=>{
 assert.throws(()=>analyzeWorldBikes(fixture.files,terrain(),{...options,sceneChildIntegration:false}),/requires scene scheduling/);
 const files={...fixture.files},rows=files['world-camera-observations.jsonl'].trim().split('\n').map(JSON.parse),row=rows.find(r=>r.phase==='updated'),block=row.blocks.find(b=>b.address===row.camera),bytes=Buffer.from(block.hex,'hex');bytes[0xb0]^=1;block.hex=bytes.toString('hex');files['world-camera-observations.jsonl']=rows.map(JSON.stringify).join('\n')+'\n';
 assert.throws(()=>analyzeWorldBikes(files,terrain(),options),/Frame matrices differ/);
 const sourceFiles={...fixture.files},sourceRows=sourceFiles['world-camera-observations.jsonl'].trim().split('\n').map(JSON.parse),source=sourceRows.find(r=>r.phase==='source-entry');
 const camera=Buffer.from(source.blocks.find(b=>b.address===source.camera).hex,'hex'),target=camera.readUInt32LE(0x1ec),body=source.blocks.find(b=>b.address===target),bodyBytes=Buffer.from(body.hex,'hex');
 bodyBytes[0x510]^=1;body.hex=bodyBytes.toString('hex');sourceFiles['world-camera-observations.jsonl']=sourceRows.map(JSON.stringify).join('\n')+'\n';
 assert.throws(()=>analyzeWorldBikes(sourceFiles,terrain(),options),/Retained bike camera inputs differ/);
});
