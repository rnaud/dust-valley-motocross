import assert from 'node:assert/strict';
import {mcmHostUploadCopyStores} from '../../src/physics/mcm/render-upload-copy.js';
// Descriptor kinds and callback entry ESP remain boundary inputs. Observed
// destination pointers/save values are checked, never used to compute stores.
export function analyzeUploadCopy(rows,moduleBase){
 const stores=new Map();let pending=null,before=false,calls=0;
 for(const [index,r] of rows.entries()){
  if(r.phase==='resource-upload-callback'){
   assert.equal(pending,null,'Unfinished upload copy');assert.equal(r.target,moduleBase+0x6b30);
   const destination=(r.esp+0x30)>>>0;assert.equal(r.destination,destination);
   const predicted=mcmHostUploadCopyStores({callerEsp:r.esp,destination,sourceBuffer:r.sourceBuffer,destinationBuffer:r.destinationBuffer,count:1});
   assert.equal(predicted.boundary,'host-copy','Buffer-backed copy is not recovered');
   pending={frame:r.frame,store:predicted.stores[0]};before=false;
  }else if(r.phase==='upload-copy-save'){
   assert.ok(pending,'Unscheduled upload copy');assert.equal(r.frame,pending.frame);
   const store=pending.store;assert.equal(r.address,store.address);assert.equal(r.destination,store.value);assert.equal((r.esp-0xc)>>>0,store.address);
   if(r.after){assert.ok(before);assert.equal(r.value,store.value);stores.set(index,store);pending=null;calls++;}
   else{assert.equal(before,false);before=true;}
  }
 }
 assert.equal(pending,null,'Incomplete upload copy');return {calls,stores};
}
