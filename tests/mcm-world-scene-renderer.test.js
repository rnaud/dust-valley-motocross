import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync,gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{analyzeWorldBikes}from'../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-scene-renderer-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true};
test('scene renderer computes and submits retained camera matrices alongside both bikes',()=>{
 const files=fixture.files;for(const[name,value]of Object.entries(files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(files,terrain(),options);assert.deepEqual(r.sceneRendererReport,{frames:63,words:12663,deviceResultsExternal:true});assert.equal(r.sceneQueueTicks,63);
 for(const[name,count]of[['entryReports',128],['reports',128],['riderReports',63],['collisionReports',127],['visualReports',127],['markerReports',256],['hudReports',256],['sceneQueueReports',256]]){assert.equal(r[name].length,count);for(const x of r[name]){assert.deepEqual(x.differences,[]);if(x.random)assert.equal(x.random.actual,x.random.expected);}}
 assert.equal(r.worldRiderReports.length,252);for(const x of r.worldRiderReports){assert.deepEqual(x.rider.differences,[]);assert.deepEqual(x.collision.differences,[]);}
 assert.equal(r.particleReports.length,567);assert.ok(r.particleReports.every(x=>x.differences===0));
 assert.equal(r.chaseReport.frames,63);assert.equal(r.sceneChildReports.length,63);for(const x of r.sceneChildReports)assert.deepEqual(x.externalActors.map(a=>a.update),[0x411000,0x423b50]);
 assert.equal((files['cleanup.log'].match(/restored=1/g)||[]).length,52);assert.match(files['cleanup.log'],/debugger=0 clean=1/);
});
test('renderer integration rejects changed submission, changed output and missing device result',()=>{
 for(const kind of ['submission','output','result']){
  const files={...fixture.files},rows=files['world-renderer-observations.jsonl'].trim().split('\n').map(JSON.parse);
  if(kind==='submission')rows.find(r=>r.phase==='submit').submit.kind=99;
  if(kind==='output'){const row=rows.find(r=>r.phase==='result'),bytes=Buffer.from(row.cameraHex,'hex');bytes[0x30]^=1;row.cameraHex=bytes.toString('hex');}
  if(kind==='result')delete rows.find(r=>r.phase==='result').result;
  files['world-renderer-observations.jsonl']=rows.map(JSON.stringify).join('\n')+'\n';
  assert.throws(()=>analyzeWorldBikes(files,terrain(),options),kind==='submission'?/submission arguments differ/:kind==='output'?/matrices differ/:/Missing renderer result/);
 }
});
