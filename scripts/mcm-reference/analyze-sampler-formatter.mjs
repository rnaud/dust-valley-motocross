import {mcmShaderSamplerMap} from '../../src/physics/mcm/shader-sampler-map.js';
import assert from 'node:assert/strict';
import {mcmSamplerFormatStackStore} from '../../src/physics/mcm/shader-sampler-format.js';
export const samplerFormatterPhases=new Set(['shader-ec5e0','shader-ec65b','shader-138260','shader-100830','shader-ucrt-1f920','shader-ucrt-697c0','shader-ucrt-697d7','shader-ucrt-733c0','shader-ucrt-733ee','shader-ec6cf','shader-d5a98']);
// Validate only captured ec5e0 invocations returning to d5a98. Invocation
// eligibility remains a boundary; the null-shader count and stores are computed.
export function analyzeSamplerFormatter(rows,{onStore=()=>{}}={}) {
 let binding=null,format=null,callback=null,bindings=0,formats=0,callbacks=0,overlappingSaves=0,remaining=0,gateOpen=false;
 const stores=[];
 for(const [index,r] of rows.entries()) {
  if(binding && r.scratch!==undefined){assert.equal(r.frame,binding.frame);assert.equal(r.scratch,binding.scratch);}
  if(binding && (r.phase==='shader-ec6cf'||r.phase==='shader-100830'||r.phase.startsWith('shader-ucrt-')))assert.ok(format,'Missing formatter entry');
  if(r.phase==='shader-ec5e0'){
   assert.equal(binding,null);binding=r;bindings++;gateOpen=false;
   // The checked return site d5a98 follows d5a7a setting shader=NULL.
   // Map contents are irrelevant to whether names are formatted.
   remaining=mcmShaderSamplerMap({samplerMap:[]},null).count;
  }else if(binding&&r.phase==='shader-ec65b'){
   assert.equal(gateOpen,false);assert.equal(r.result,(binding.result+0x574)>>>0,'Sampler map pointer');gateOpen=true;
  }else if(binding&&r.phase==='shader-138260'){
   assert.ok(gateOpen,'Missing sampler mapping return');
   assert.equal(format,null);assert.ok(remaining>0,'Unexpected sampler format');remaining--;const callerEsp=(binding.esp-0x50)>>>0;
   assert.equal(r.esp,(callerEsp-4)>>>0);
   format={callerEsp,store:mcmSamplerFormatStackStore({callerEsp}),count:0,saves:0};formats++;
  }else if(format&&r.phase==='shader-100830')assert.equal(r.esp,format.callerEsp-0x24);
  else if(format&&r.phase==='shader-ucrt-1f920')assert.equal(r.esp,format.callerEsp-0x50);
  else if(format&&r.phase==='shader-ucrt-697c0')assert.equal(r.esp,format.callerEsp-0x8c);
  else if(format&&r.phase==='shader-ucrt-697d7')assert.equal(r.esp,((format.callerEsp-0x8c)&0xfffffff0)-0x364);
  else if(format&&r.phase==='shader-ucrt-733c0'){
   assert.equal(callback,null);const parserBody=(((format.callerEsp-0x8c)&0xfffffff0)-0x364)>>>0;
   assert.ok(r.esp===parserBody-0x38||r.esp===parserBody-4,'Unexpected output callback stack');
   callback=r;format.count++;callbacks++;
  }else if(format&&r.phase==='shader-ucrt-733ee'){
   assert.ok(callback);assert.equal(r.esp,callback.esp-0x18);assert.equal(r.scratch,callback.scratch);
   if(callback.esp-0xc===format.store.address){
    format.saves++;
    if(r.scratch===format.store.address){
     assert.equal(r.value,format.store.value,'Sampler formatter register save');overlappingSaves++;
    }
    stores.push({frame:r.frame,...format.store});onStore(index,format.store);
   }
   callback=null;
  }else if(format&&r.phase==='shader-ec6cf'){
   assert.equal(callback,null);assert.equal(r.esp,format.callerEsp);
   assert.equal(format.count,3,'Expected prefix, literal and unsigned-index output');
   assert.equal(format.saves,2,'Expected prefix and unsigned-index helper saves');format=null;
  }else if(binding&&r.phase==='shader-d5a98'){
   assert.equal(format,null);assert.equal(callback,null);if(gateOpen)assert.equal(remaining,0,'Missing derived sampler formats');assert.equal(r.esp,binding.esp+4);binding=null;
  }
 }
 assert.equal(binding,null,'Incomplete sampler binding');assert.equal(format,null);assert.equal(callback,null);
 return {bindings,formats,callbacks,overlappingSaves,stores};
}
