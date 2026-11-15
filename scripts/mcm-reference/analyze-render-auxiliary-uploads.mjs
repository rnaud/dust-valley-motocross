import assert from 'node:assert/strict';
import {mcmRenderAuxiliaryUploads} from '../../src/physics/mcm/render-upload.js';
const callers=new Set([0x1c10ab,0x1c158e,0x1c004f,0x1c0374]);
export function analyzeRenderAuxiliaryUploads(cases){
 const result={applications:cases.length,matrix128:0,matrix256:0,textureMatrices:0,parameters:0};
 assert.ok(cases.length);
 for(const {entry,input,prepared,config,uploads} of cases){
  assert.equal(input.frame,entry.frame);assert.equal(config.frame,entry.frame);
  assert.equal(config.block,input.block);assert.equal(prepared.block,input.block);
  assert.deepEqual(prepared.dirty,input.dirty);
  const expected=mcmRenderAuxiliaryUploads({entryEsp:entry.esp,dirty108:input.dirty[2],state2540:config.state2540});
  const actual=uploads.filter(u=>callers.has(u.caller-0x7a770000));
  assert.equal(actual.length,expected.length,'Auxiliary upload gate differs');
  for(let i=0;i<expected.length;i++){
   const e=expected[i],a=actual[i];assert.equal(a.frame,entry.frame);
   assert.equal(a.caller-0x7a770000,e.callerRva,'Upload order/caller differs');
   for(const key of ['kind','flags','offset','count','data'])assert.equal(a[key],e[key],key+' differs');
   result[e.callerRva===0x1c158e?'matrix128':e.callerRva===0x1c10ab?'matrix256':e.callerRva===0x1c004f?'textureMatrices':'parameters']++;
  }
 }
 return result;
}
