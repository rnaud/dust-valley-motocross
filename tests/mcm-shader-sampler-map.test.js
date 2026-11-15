import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';
import{mcmShaderSamplerMap}from'../src/physics/mcm/shader-sampler-map.js';
import{bindMcmShaderSamplers}from'../src/physics/mcm/shader-sampler-bindings.js';
const fixture=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));
test('sampler mapping matches 4096 intact native legacy and modern cases',()=>{
 const f=fixture('shader-sampler-map'),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');assert.equal(input.length,4096*44);assert.equal(output.length,4096*12);assert.equal(f.provenance.outputSha256,f.provenance.repeatSha256);
 let equal=0,different=0;
 for(let c=0;c<4096;c++){
  const a=Array.from({length:11},(_,j)=>input.readUInt32LE(c*44+j*4)),map=[];
  const r=mcmShaderSamplerMap({samplerMap:map,glInfo:{stageSamplerCounts:a.slice(3,8),computeSamplerCount:a[8],computeSamplerOffset:a[9],unitLimit:a[10]}},a[0]?null:{type:a[1],major:a[2]});
  assert.ok(r.map===map||r.map===null);
  assert.deepEqual([r.first,r.count,r.map===map?1:0],Array.from({length:3},(_,j)=>output.readUInt32LE(c*12+j*4)),`native mapping ${c}`);
  if(!a[0]&&a[1]===5&&(a[2]&255)>3){if(a[9]===a[10])equal++;else different++;}
 }
 assert.deepEqual({equal,different},{equal:130,different:84});
});
test('default fixed-function mapping composes with native sampler-binding cases',()=>{
 const f=fixture('shader-sampler-bindings'),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');let cases=0;
 for(let c=0;c<input.length/124;c++){
  const a=Array.from({length:31},(_,j)=>input.readUInt32LE(c*124+j*4)),flags=a[0];
  if((flags&6)!==6||a[4]!==0||a[5]!==8)continue;
  const map=a.slice(7,23),buffer={},events=[];let current;
  const ctx={shader:null,samplerMap:map,program:a[3],glInfo:{explicitBindings:flags&1,version:a[1],unitLimit:a[6]}};
  bindMcmShaderSamplers(ctx,{
   acquire(){events.push([2,0,0,0]);return buffer;},
   format(b,p,i){assert.equal(b,buffer);assert.equal(p,'ps');current=i;events.push([3,0,i,0]);},
   query(p,b){assert.equal(b,buffer);const v=a[23+current];events.push([4,p,current,v]);if(flags&8)ctx.glInfo.unitLimit=(ctx.glInfo.unitLimit^0xffffffff)>>>0;if(flags&16)map[current]=0;return v;},
   bind(l,u){events.push([5,l,u,0]);},release(b){assert.equal(b,buffer);events.push([6,0,0,0]);},
  });
  const native=Array.from({length:output.readUInt32LE(c*516)},(_,i)=>Array.from({length:4},(_,j)=>output.readUInt32LE(c*516+4+i*16+j*4))).filter(e=>e[0]!==1);
  assert.deepEqual(events,native,`composed native case ${c}`);cases++;
 }
 assert.equal(cases,6);
});
