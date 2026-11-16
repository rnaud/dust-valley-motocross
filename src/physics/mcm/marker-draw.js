import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
import {projectMcmBounds} from './projected-bounds.js';

// Inline product in 446220 (44627f..44651d). Its addition order differs
// from the bike wrapper's 44faf0 product.
export function composeMcmShapeProduct(camera,local){
 const out=new Float32Array(16);
 for(let column=0;column<4;column++){
  const i=column*4;
  for(let row=0;row<4;row++){
   const term=k=>mul(camera[k*4+row],local[i+k]);
   out[i+row]=Math.fround(row%2===0?add(add(add(term(3),term(2)),term(1)),term(0)):add(add(add(term(1),term(0)),term(3)),term(2)));
  }
 }
 return out;
}

// 475560 delegates to the ordinary child traversal only when both gates pass.
export function drawMcmMarker(marker,children){
 return marker.getUint32(0x70,true)&&marker.getUint32(0x34,true)?children():1;
}

// 446220. Cached bounds are supplied by 4b9510; bounds reconstruction and
// device submission are explicit services, not assumed successes.
export function drawMcmShape({node,mesh,projection,viewport,bounds},services){
 let projected=null;
 if(!mesh.hidden){
  const {center,extent}=bounds();
  projected=projectMcmBounds({matrix:composeMcmShapeProduct(projection,node.local),center,extent,viewport,rect:mesh.rect});
  mesh.rect=projected.rect;
  if(projected.accepted){
   if(mesh.dispatchReady){
    if(!mesh.buffersReady)services.load();
    services.draw();
   }else services.alternate();
  }
 }
 mesh.needsUpdate=1;
 return {result:1,projected};
}
