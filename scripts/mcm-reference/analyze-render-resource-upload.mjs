import assert from 'node:assert/strict';
import {mcmRenderResourceUpload} from '../../src/physics/mcm/render-resource-upload.js';
import {analyzeRenderStaging} from './analyze-render-staging.mjs';
export function analyzeRenderResourceUploads(cases,heapHandle){
 let allocatedBytes=0;const kinds={};assert.ok(cases.length);
 for(const c of cases){
  const {upload,config,staging,command,allocation}=c;
  assert.equal(config.frame,upload.frame);assert.equal(config.kind,upload.kind);assert.equal(config.cs,upload.cs);
  assert.notEqual(config.cachedResource,0,'Live fixture covers cached resources only');
  const computed=mcmRenderResourceUpload({...upload,...config});
  for(const key of Object.keys(computed.update))assert.deepEqual(staging.input[key],computed.update[key],`Resource ${key} differs`);
  assert.equal(staging.input.cs,upload.cs);assert.equal(staging.input.frame,upload.frame);
  const joined={...staging,input:{...staging.input,...computed.update}};
  allocatedBytes+=analyzeRenderStaging([joined],heapHandle).allocatedBytes;
  assert.equal(command.frame,upload.frame);assert.equal(allocation.frame,upload.frame);
  assert.equal(command.address,allocation.address);
  assert.deepEqual(command.words,[...computed.command],'Post-upload command differs');
  kinds[upload.kind]=(kinds[upload.kind]??0)+1;
 }
 return {uploads:cases.length,allocatedBytes,heapStores:cases.length,postUploadCommands:cases.length,kinds};
}
