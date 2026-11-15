import fs from 'node:fs';import assert from 'node:assert/strict';import{bindMcmShaderSamplers}from'../src/physics/mcm/shader-sampler-bindings.js';
import test from 'node:test';import{brotliDecompressSync}from'node:zlib';
test('sampler-binding gate, lookup and update ordering match 4096 native cases',()=>{
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/shader-sampler-bindings-wine11.json.br',import.meta.url))));
const input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');assert.equal(input.length,4096*124);assert.equal(fixture.provenance.outputSha256,fixture.provenance.repeatSha256);assert.equal(output.length,input.length/124*516);let formats=0,binds=0,skipped=0;
for(let c=0;c<input.length/124;c++){
 const a=Array.from({length:31},(_,i)=>input.readUInt32LE(c*124+i*4));const flags=a[0],map=a.slice(7,23),events=[];let current;
 const ctx={glInfo:{explicitBindings:flags&1,version:a[1],unitLimit:a[6]},shader:flags&2?null:{type:a[2]},program:a[3]};const buffer={};
 const event=(...e)=>events.push(e);
 bindMcmShaderSamplers(ctx,{
  getSamplerMap(shader){event(1,shader?.type??0xffffffff,a[4],a[5]);return{first:a[4],count:a[5],map:flags&4?map:null};},
  acquire(){event(2,0,0,0);return buffer;},
  format(b,p,i){assert.equal(b,buffer);current=i;event(3,['ps','vs','gs','hs','ds','cs','unknown'].indexOf(p),i,0);formats++;},
  query(p,b){assert.equal(b,buffer);const v=a[23+current];event(4,p,current,v);if(flags&8)ctx.glInfo.unitLimit=(ctx.glInfo.unitLimit^0xffffffff)>>>0;if(flags&16)map[a[4]+current]=0;return v;},
  bind(l,u){event(5,l,u,0);binds++;},release(b){assert.equal(b,buffer);event(6,0,0,0);},
 });
 const expected=Buffer.alloc(516);expected.writeUInt32LE(events.length);events.flat().forEach((v,i)=>expected.writeUInt32LE(v>>>0,4+i*4));assert.deepEqual(output.subarray(c*516,(c+1)*516),expected,`native case ${c}`);if(!events.length)skipped++;
}
assert.deepEqual({formats,binds,skipped},{formats:13181,binds:8130,skipped:800});
});
