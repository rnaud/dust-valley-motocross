import assert from 'node:assert/strict';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {aimMcmCamera} from '../../src/physics/mcm/camera-target.js';
import {composeMcmViewMatrix} from '../../src/physics/mcm/view-matrix.js';
const floats=w=>Array.from(new Float32Array(Uint32Array.from(w).buffer));
const bits=v=>Array.from(new Uint32Array(Float32Array.from(v).buffer));
export function analyzeLiveCameraTarget(rows){
 let pending=null,pairs=0,words=0,views=0,ignoredViews=0;const cameras=new Map(),viewPending=new Map();
 for(const r of rows){
  if(r.phase==='before-target'){
   assert.equal(pending,null,'Unpaired target');assert.equal(r.callee,0x47a3d0);assert.equal(r.retainedMode,0,'Unsupported retained-mode camera');
   assert.equal(r.words.length,10);assert.equal(r.aimWords.length,3);
   const camera={values:floats(r.words),upValid:r.upValid,forwardValid:r.forwardValid,refreshCounter:r.refreshCounter};
   const ret=aimMcmCamera(camera,floats(r.aimWords),r.ownerCounter);pending={row:r,camera,ret};
  }else if(r.phase==='after-target'){
   assert.ok(pending,'Missing target entry');assert.equal(r.camera,pending.row.camera);assert.equal(r.frame,pending.row.frame);
   assert.equal(r.esp,pending.row.esp+12,'Invalid target return');assert.equal(r.retainedMode,0);assert.equal(r.returnValue,pending.ret);
   assert.deepEqual(r.words,bits(pending.camera.values),'Camera target output differs');
   for(const key of ['upValid','forwardValid','refreshCounter'])assert.equal(r[key],pending.camera[key],key);
   cameras.set(r.camera,pending.camera.values);pairs++;words+=14;pending=null;
  }else if(r.phase==='before-view'){
   assert.ok(!viewPending.has(r.camera),'Unpaired view');const values=cameras.get(r.camera);
   if(values){assert.deepEqual(r.words,bits(values),'View inputs differ from computed target');viewPending.set(r.camera,{frame:r.frame,result:bits(composeMcmViewMatrix(values))});}
   else{ignoredViews++;viewPending.set(r.camera,{ignored:true});}
  }else if(r.phase==='after-view'){
   const p=viewPending.get(r.camera);assert.ok(p,'Missing view input');if(!p.ignored){assert.equal(r.frame,p.frame);assert.deepEqual(r.words,p.result,'Derived view differs');views++;}viewPending.delete(r.camera);
  }
 }
 assert.ok(!pending&&viewPending.size===0,'Incomplete camera capture');
 return {pairs,words,views,viewWords:views*16,ignoredViews};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeLiveCameraTarget(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
