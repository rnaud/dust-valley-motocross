import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {analyzeChaseFrame} from '../scripts/mcm-reference/analyze-chase-frame.mjs';
import {decodeChaseFrameMemory} from '../scripts/mcm-reference/chase-frame-memory.mjs';
import {stepMcmChaseFrame} from '../src/physics/mcm/chase-frame.js';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}.json.br`,import.meta.url))));
const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
const terrain={root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
test('chase frame evolves from entry inputs through matrices without intermediate evolution inputs',()=>{
 const fixture=read('camera-matrices-wine11');
 for(const rows of [fixture.live,fixture.held.live,fixture.neutral.live]){
  const selected=rows.filter(r=>['source-entry','fov-entry','updated'].includes(r.phase)),frames=selected.length/3;
  assert.deepEqual(analyzeChaseFrame(selected,terrain),{frames,words:frames*150,intermediateEvolutionInputs:0,tailControlAssertions:frames});
 }
 assert.throws(()=>stepMcmChaseFrame({}, {},.02,{}),/Unconnected chase tail controls/);
});
test('raw original memory maps player and moving AI bike inputs into retained chase frames',()=>{
 const fixture=read('chase-frame-memory-wine11');
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 for(const [kind,capture]of Object.entries(fixture.captures)){
  // The native Windows text stream uses CRLF; preserve it for source identity.
  assert.equal(createHash('sha256').update(capture.rows.map(r=>JSON.stringify(r)).join('\r\n')+'\r\n').digest('hex'),capture.sourceSha256);
  const rows=capture.rows.map(decodeChaseFrameMemory);
  assert.deepEqual(analyzeChaseFrame(rows,terrain),{frames:60,words:9000,intermediateEvolutionInputs:0,tailControlAssertions:60});
  assert.match(capture.cleanup,/renderFrames=60 status=1 debugger=0/);assert.equal((capture.cleanup.match(/restored=1/g)||[]).length,3);
  if(kind==='ai')assert.equal(new Set(rows.filter(r=>r.phase==='source-entry').map(r=>r.inputs.slice(58,61).join(','))).size,60);
 }
 assert.match(fixture.selection,/target_changed=04ec92a0->04ef7af8 verified=1/);
 assert.match(fixture.restoration,/target_changed=04ef7af8->04ec92a0 verified=1/);
 const rows=fixture.captures.ai.rows.map(decodeChaseFrameMemory);
 for(const [phase,field,index,pattern]of [['updated','matrices',0,/Frame matrices differ/],['updated','cameraPose',0,/Frame pose differs/],['source-entry','filters',0,/Entry retained filters differ/],['fov-entry','inputs',49,/tail controls changed camera/],['source-entry','inputs',11,/retained camera context changed/]]){
  const mutated=structuredClone(rows),r=mutated.find(r=>r.frame===1&&r.phase===phase);r[field][index]=(r[field][index]^1)>>>0;
  assert.throws(()=>analyzeChaseFrame(mutated,terrain),pattern);
 }
 assert.throws(()=>analyzeChaseFrame(rows.slice(0,-1),terrain),/Incomplete/);
 const missing=structuredClone(fixture.captures.ai.rows[0]);missing.blocks=missing.blocks.filter(b=>b.address!==missing.camera);assert.throws(()=>decodeChaseFrameMemory(missing),/Missing chase memory/);
});
