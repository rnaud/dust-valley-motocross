import assert from 'node:assert/strict';
import {analyzeLiveChaseController} from './analyze-live-chase-controller.mjs';
import {restoreMcmSubmissionPlanes} from '../../src/physics/mcm/camera-submission.js';
import {multiplyWineRenderMatrix} from '../../src/physics/mcm/wine-render-matrix.js';
const floats=w=>new Float32Array(Uint32Array.from(w).buffer),bits=f=>Array.from(new Uint32Array(f.buffer));
const identity=bits(Float32Array.of(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1));
export function analyzeCameraSubmission(rows,terrain){
 const computed=new Map();const chain=analyzeLiveChaseController(rows.filter(r=>Array.isArray(r.inputs)),{terrain,matrices:true,onMatrices:r=>computed.set(r.frame,r)});
 let latestFrame=-1,submittedFrame=-1;let submission=null,product=null,stores=0,submissions=0,products=0,bikeCarryChecks=0,lastStore=null;const scratchChanges=[];
 for(const r of rows){
  if(r.inputs){if(r.phase==='updated')latestFrame=r.frame;continue;}
  assert.equal(r.frame,latestFrame+1,'Renderer event reordered relative to camera update');
  if(r.phase==='bike-entry'){
   if(lastStore){assert.equal(r.scratchAddress,lastStore.address,'Physics scratch address changed');assert.equal(r.scratchBits,lastStore.word,'Later writer changed physics entry scratch');bikeCarryChecks++;}continue;
  }
  if(r.phase==='submit-entry'){
   assert.equal(submission,null,'Nested submission');const c=computed.get(r.frame-1);assert.ok(c,'Submission precedes recovered camera');assert.equal(r.camera,c.camera,'Different submission camera');
   assert.equal(r.refreshByte,0,'Unrecovered surface-clear path');assert.equal(r.activeCamera,r.camera,'Unrecovered inactive-camera submission');
   const state=structuredClone(c.state);assert.deepEqual(r.planes,bits(Float32Array.of(state.near,state.far)),'Submission planes differ at entry');
   const result=restoreMcmSubmissionPlanes(state,null);assert.ok(result.rebuilt,'Expected observed plane rebuild');submission={entry:r,state,matrices:result.matrices,stage:0};
  }else if(r.phase==='submit-view'||r.phase==='submit-projection'){
   assert.ok(submission,'Missing submission entry');const isView=r.phase==='submit-view';assert.equal(submission.stage,isView?0:1,'Submission order changed');assert.equal(r.camera,submission.entry.camera);
   assert.equal(r.activeCamera,r.camera);assert.deepEqual(r.planes,bits(Float32Array.of(1,100000)));assert.equal(r.args[1],isView?2:3);assert.ok(r.args[0],'Missing graphics device');if(isView)submission.device=r.args[0];else assert.equal(r.args[0],submission.device,'Submission device changed');assert.equal(r.args[2],r.camera+(isView?0x70:0x30));
   assert.deepEqual(r.words,bits(isView?submission.matrices.view:submission.matrices.projection),'Submitted computed matrix differs');submission.stage++;
  }else if(r.phase==='submit-exit'){
   assert.ok(submission&&submission.stage===2,'Incomplete submission');assert.equal(r.camera,submission.entry.camera);assert.equal(r.refreshCounter,submission.state.refreshCounter,'Submission counter changed');assert.deepEqual(r.planes,bits(Float32Array.of(1,100000)));submittedFrame=r.frame;if(r.scratchBits!==submission.entry.scratchBits)scratchChanges.push(r.frame);submissions++;submission=null;
  }else if(r.phase==='product-before'){
   assert.equal(product,null,'Nested product');assert.equal(r.frame,submittedFrame,'Product precedes camera submission');const c=computed.get(r.frame-1);assert.ok(c,'Product precedes recovered camera');assert.equal(r.destination+8,r.scratchAddress);
   // This capture's world transform is identity. Reject any other world state;
   // world-transform submission and draw gates are still unrecovered here.
   assert.deepEqual(r.words.slice(16),identity,'Unrecovered nonidentity render world matrix');
   const view=floats(c.words.slice(16,32));assert.deepEqual(r.words.slice(0,16),bits(view),'Renderer view differs from computed camera');
   product={result:bits(multiplyWineRenderMatrix(view,floats(identity))),destination:r.destination,address:r.scratchAddress,stage:0};
  }else if(r.phase==='product-store'){
   assert.ok(product&&product.stage===0,'Missing product before store');assert.equal(r.destination,product.destination);product.stage=1;
  }else if(r.phase==='scratch-store'){
   assert.ok(product&&product.stage===1,'Missing exact store boundary');assert.equal(r.scratchAddress,product.address);assert.equal(r.scratchBits,product.result[2],'Computed renderer scratch store differs');product.stage=2;stores++;lastStore={address:r.scratchAddress,word:r.scratchBits};
  }else if(r.phase==='product-after'){
   assert.ok(product&&product.stage===2,'Missing exact store result');assert.deepEqual(r.words,product.result,'Computed renderer product differs');products++;product=null;
  }else throw Error('Unexpected submission event '+r.phase);
 }
 assert.ok(!submission&&!product,'Incomplete renderer capture');assert.ok(stores&&submissions&&bikeCarryChecks,'Missing renderer/physics evidence');
 return {chain,submissions,submissionWords:submissions*32,products,productWords:products*16,stores,bikeCarryChecks,submissionScratchChanges:scratchChanges.length};
}
