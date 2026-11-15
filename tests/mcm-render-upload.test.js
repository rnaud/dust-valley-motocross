import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';
import{analyzeRenderUpload}from'../scripts/mcm-reference/analyze-render-upload.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-upload-wine11.json.br',import.meta.url))));
test('both native transform-upload paths and payload addresses match 868 applications',()=>{
 assert.deepEqual(analyzeRenderUpload(fixture.cases),{applications:868,uploads:16,viewportUploads:12,stateUploads:4,skips:852});
 assert.match(fixture.provenance.cleanup,/debugger=0 clean=1/);
});
test('upload audit detects omitted transformed vertices and incorrect payload addresses',()=>{
 const cases=structuredClone(fixture.cases),c=cases.find(c=>c.declaration.transformed&&c.uploads.some(u=>u.caller===0x7a770000+0x1bf994));
 c.declaration.transformed=0;assert.throws(()=>analyzeRenderUpload(cases));
 const bad=structuredClone(fixture.cases);bad.find(c=>c.uploads.some(u=>u.caller===0x7a770000+0x1bf994)).uploads.find(u=>u.caller===0x7a770000+0x1bf994).data+=4;
 assert.throws(()=>analyzeRenderUpload(bad),/data differs/);
});
