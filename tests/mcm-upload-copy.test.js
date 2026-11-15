import {analyzeUploadCopy} from '../scripts/mcm-reference/analyze-upload-copy.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {mcmHostUploadCopyStores} from '../src/physics/mcm/render-upload-copy.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/upload-copy-wine11.json.br',import.meta.url))));
test('intact Wine host copy preserves bytes and saves the descriptor for all 612 cases',()=>{
 const f=fixture(),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');assert.equal(input.length,612*12);assert.equal(output.length,612*260);
 for(let i=0;i<612;i++){
  const count=input.readUInt32LE(i*12),size=input.readUInt32LE(i*12+4);assert.equal(output.readUInt32LE(i*260),1,`native stack save ${i}`);
  const expected=Buffer.alloc(256,0xcc);for(let range=0;range<count;range++)for(let j=0;j<size;j++){const at=range*24+j;expected[at]=(at*17+i)&255;}
  assert.deepEqual(output.subarray(i*260+4,(i+1)*260),expected);
  const r=mcmHostUploadCopyStores({callerEsp:0x22f088,destination:0x22f0b8,sourceBuffer:0,destinationBuffer:0,count});assert.equal(r.stores.length,count);for(const store of r.stores)assert.deepEqual(store,{address:0x22f038,value:0x22f0b8});
 }
});
function checkLive(rows){let expected=null,before=false,calls=0;for(const r of rows){
 if(r.phase==='resource-upload-callback'){
  assert.equal(expected,null,'Previous callback not checked');assert.equal(r.target,0x7a776b30);assert.equal(r.destination,(r.esp+0x30)>>>0);
  const p=mcmHostUploadCopyStores({...r,callerEsp:r.esp,count:1});assert.equal(p.boundary,'host-copy');expected=p.stores[0];before=false;
 }else{
  assert.ok(expected);assert.equal(r.address,expected.address);assert.equal(r.destination,expected.value);assert.equal(r.esp-0xc,expected.address);
  if(r.after){assert.ok(before);assert.equal(r.value,expected.value);expected=null;calls++;}else{assert.equal(before,false);before=true;}
 }
}assert.equal(expected,null);return calls;}
test('194 live copy calls match predicted register-save addresses and values',()=>{
 const f=fixture();assert.equal(checkLive(f.rows),194);assert.equal(analyzeUploadCopy(f.rows,0x7a770000).calls,194);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,176);assert.match(f.provenance.run,/captured=10 status=1/);
});
test('corrupted saved values and missing copies are rejected; buffer paths stay explicit',()=>{
 let f=fixture();f.rows.find(r=>r.phase==='upload-copy-save'&&r.after).value^=1;assert.throws(()=>checkLive(f.rows));assert.throws(()=>analyzeUploadCopy(f.rows,0x7a770000));
 f=fixture();f.rows.splice(f.rows.findIndex(r=>r.phase==='upload-copy-save'&&r.after),1);assert.throws(()=>checkLive(f.rows));assert.throws(()=>analyzeUploadCopy(f.rows,0x7a770000));
 for(const [sourceBuffer,destinationBuffer]of [[1,0],[0,1],[1,1]])assert.deepEqual(mcmHostUploadCopyStores({sourceBuffer,destinationBuffer,count:1}),{boundary:'buffer-backed',stores:[]});
});
