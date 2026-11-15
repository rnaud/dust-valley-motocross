import assert from 'node:assert/strict';import {analyzeRenderGates} from './analyze-render-gates.mjs';import {analyzeProjectedBounds} from './analyze-projected-bounds.mjs';import {composeMcmWrapperProduct} from '../../src/physics/mcm/wrapper-product.js';
const floats=w=>new Float32Array(Uint32Array.from(w).buffer),bits=f=>Array.from(new Uint32Array(f.buffer,f.byteOffset,f.length));
export function analyzeWrapperProduct(rows,terrain){
 const cameras=new Map();analyzeRenderGates(rows,terrain,{onWrapperCamera:c=>cameras.set(c.event,c)});
 const rewritten=[],stack=[];let pending=null,computedProducts=0,warmupProducts=0,copiedBounds=0;
 for(const r of rows){
  if(r.phase==='wrapper-inputs'){assert.equal(pending,null);pending=r;continue;}
  if(r.phase==='wrapper-entry'){
   assert.ok(pending,'Missing wrapper inputs');assert.equal(r.object,pending.object);assert.equal(r.node,pending.node);assert.equal(r.frame,pending.frame);stack.push({entry:r,source:pending,used:false});pending=null;
  }
  if(r.phase==='bounds-entry'){
   const w=stack.at(-1);assert.ok(w&&!w.used,'Missing wrapper input scope');assert.equal(r.camera,w.source.camera);assert.equal(r.frame,w.source.frame);w.used=true;
   const source=w.source,local=floats(source.words.slice(0,16)),camera=cameras.get(source);
   let combined;
   if(camera){assert.equal(r.camera,camera.camera);combined=camera.matrices.combined;assert.deepEqual(source.words.slice(16,32),bits(combined),'Stored camera combined matrix differs');assert.equal(source.words[40],camera.state.width,'Wrapper viewport width differs');computedProducts++;}
   else {assert.equal(r.frame,0,'Missing computed camera after warmup');combined=floats(source.words.slice(16,32));warmupProducts++;}
   const product=bits(composeMcmWrapperProduct(combined,local));assert.deepEqual(r.words.slice(0,16),product,'Computed wrapper matrix differs');assert.deepEqual(r.words.slice(16,22),source.words.slice(32,38),'Actor bounds copy differs');assert.deepEqual(r.words.slice(22,26),source.words.slice(38,42),'Wrapper viewport copy differs');copiedBounds++;
   rewritten.push({...r,words:[...product,...source.words.slice(32,38),...source.words.slice(38,42),...r.words.slice(26)]});
  }else rewritten.push(r);
  if(r.phase==='wrapper-exit'){const w=stack.pop();assert.ok(w?.used,'Wrapper exited before bounds');assert.equal(r.object,w.entry.object);}
 }
 assert.ok(!pending&&!stack.length,'Incomplete wrapper product capture');assert.ok(computedProducts);return {bounds:analyzeProjectedBounds(rewritten,terrain),computedProducts,warmupProducts,copiedBounds,computedMatrixWords:computedProducts*16};
}
