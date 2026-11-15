import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {analyzeRenderAuxiliaryUploads} from '../scripts/mcm-reference/analyze-render-auxiliary-uploads.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-auxiliary-uploads-wine11.json.br',import.meta.url))));
test('three auxiliary upload families match native gates, order and descriptors',()=>{
 assert.deepEqual(analyzeRenderAuxiliaryUploads(fixture.cases),{applications:871,matrix128:20,matrix256:0,textureMatrices:8,parameters:16});
 assert.match(fixture.provenance.cleanup,/debugger=0 clean=1/);
});
test('native auxiliary audit rejects incorrect matrix size and texture source address',()=>{
 const cases=structuredClone(fixture.cases);
 cases.find(c=>c.uploads.some(u=>u.caller===0x7a770000+0x1c158e)).config.state2540=1;
 assert.throws(()=>analyzeRenderAuxiliaryUploads(cases),/caller differs/);
 const bad=structuredClone(fixture.cases);
 bad.flatMap(c=>c.uploads).find(u=>u.caller===0x7a770000+0x1c004f).data-=0x140;
 assert.throws(()=>analyzeRenderAuxiliaryUploads(bad),/data differs/);
});
