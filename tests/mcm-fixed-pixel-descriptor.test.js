import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';
import{mcmFixedPixelDescriptor}from'../src/physics/mcm/fixed-pixel-descriptor.js';import{unpackFixedPixelInput}from'../scripts/mcm-reference/fixed-pixel-input.mjs';
test('complete pixel descriptor matches 8192 intact native cases with seeded buffers',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/fixed-pixel-descriptor-wine11.json.br',import.meta.url))));
 const input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');assert.equal(input.length,8192*924);assert.equal(output.length,8192*132);assert.equal(f.provenance.outputSha256,f.provenance.repeatSha256);
 let retained=0;
 for(let c=0;c<8192;c++){
  const a=Array.from({length:231},(_,j)=>input.readUInt32LE(c*924+j*4)),config=unpackFixedPixelInput(a),r=mcmFixedPixelDescriptor(config);
  assert.deepEqual(Buffer.from(r),output.subarray(c*132,(c+1)*132),`native pixel descriptor ${c}`);
  if(config.stageCount&&config.stages[0][0]!==1&&r[14]===config.seed[14]&&r[14])retained++;
 }
 assert.ok(retained>1000,'Nonzero inherited stage bytes covered');
});
