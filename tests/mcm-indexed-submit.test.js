import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {submitMcmIndexedDraw} from '../src/physics/mcm/indexed-submit.js';
test('indexed submission gates, argument order and boundary mutation timing match 4096 native cases',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/indexed-submit-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');assert.equal(input.length,4096*32);assert.equal(output.length,4096*56);
 for(let i=0;i<4096;i++){
  const a=Array.from({length:8},(_,j)=>input.readUInt32LE(i*32+j*4)),flags=a[0],events=[],result=Array(14).fill(0),context={device:{},state:{indexBuffer:(flags>>1)&1,field1a4:a[1],field1a8:a[2]}};context.device.immediate=flags&1?context:null;
  submitMcmIndexedDraw(context,a.slice(3),{
   lock(){events.push(1);if(flags&4)context.state.indexBuffer^=1;if(flags&8)context.device.immediate=null;},
   emit(args){events.push(2);result.splice(4,8,...args);if(flags&16)context.device.immediate=context.device.immediate===context?null:context;},
   unlock(){events.push(3);},
  });
  result[0]=events.length;result.splice(1,events.length,...events);result[12]=+(context.device.immediate===context);result[13]=context.state.indexBuffer;
  assert.deepEqual(result,Array.from({length:14},(_,j)=>output.readUInt32LE(i*56+j*4)),`case ${i}`);
 }
});
