import assert from 'node:assert/strict';
import {mcmRenderTransformUpload} from '../../src/physics/mcm/render-upload.js';
export function analyzeRenderUpload(cases){
 let uploads=0,viewportUploads=0,stateUploads=0,skips=0;
 assert.ok(cases.length);
 for(const c of cases){
  const {entry,input,prepared,declaration}=c;
  assert.equal(input.frame,entry.frame);assert.equal(prepared.block,input.block);
  assert.equal(declaration.block,input.block);assert.equal(declaration.frame,input.frame);
  // In this capture preparation leaves these gate inputs unchanged. Do not
  // silently replace recovered inputs with later observed values.
  assert.deepEqual(prepared.dirty,input.dirty);assert.equal(prepared.flags58,input.flags58);
  const expected=mcmRenderTransformUpload({entryEsp:entry.esp,stateAddress:input.block,
   transformed:declaration.transformed,dirty104:input.dirty[1],dirty108:input.dirty[2],flags58:input.flags58});
  const actual=c.uploads.filter(u=>u.caller===0x7a770000+0x1bf994);
  assert.equal(actual.length,expected?1:0,'Transform-upload gate differs');
  if(expected){
   assert.equal(actual[0].frame,entry.frame);
   for(const key of Object.keys(expected))assert.equal(actual[0][key],expected[key],key+' differs');
   uploads++;if(declaration.transformed)viewportUploads++;else stateUploads++;
  }else skips++;
 }
 return {applications:cases.length,uploads,viewportUploads,stateUploads,skips};
}
