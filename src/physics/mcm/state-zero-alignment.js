import {floatBits} from './math.js';
import {inverseRotateMcmVector} from './world-transform.js';
import {rotateMcmTransformAtPivot} from './transform.js';

// Original alternate state-zero branch 0x4ac1f7..0x4ac5c5, before event handling.
export function updateMcmStateZeroAlignment(c){
 const f=Math.fround,bits=floatBits,signed=v=>bits(v)|0,sign=v=>bits(v)>0x80000000?-1:1;
 let matrix=[...c.matrix],angularVelocity=[...c.angularVelocity],scratch540=[...c.scratch540],axis624=[...c.axis624],local420=[...c.local420];
 let field6b0=c.field6b0,field6a8=c.field6a8,field6ac=c.field6ac,cacheValid=c.cacheValid;
 if(!c.mask)return {matrix,angularVelocity,scratch540,axis624,local420,field6b0:0,field6a8,field6ac,cacheValid};
 if(c.mask===1){
  if(c.both&&(signed(c.field90)>=0x38d1b717||Math.abs(c.rotation)>f(.0001))){
   scratch540=[...c.normal2e8];axis624=inverseRotateMcmVector(matrix,scratch540);
   const angle=(bits(c.rotation)&0x7fffffff)!==0&&signed(c.field90)<0x3a83126f?c.rotation:f(c.angle74+c.rotation);
   matrix=rotateMcmTransformAtPivot(matrix,c.pivot,axis624,angle);cacheValid=0;
   angularVelocity=angularVelocity.map(v=>f(v*f(.9)));
  }
 }else field6b0=0;
 field6a8=f((c.component44*f(.05)+field6b0*f(.2))*c.field4c);
 const magnitude=Math.abs(field6a8);
 if((bits(c.field6d8)&0x7fffffff)!==0&&(bits(c.field54)&0x7fffffff)===0&&f(.087)>magnitude)field6a8=f(sign(c.field6d8)*f(.087));
 // The limit compares the magnitude captured before the minimum correction.
 if(c.field83c<magnitude)field6a8=f(sign(field6a8)*c.field83c);
 field6ac=f(c.field4f0-field6a8);
 if(Number.isFinite(field6ac)&&Math.abs(field6ac)>=f(.0001)){
  const rate=sign(c.field4d8)===sign(field6ac)?f(c.field840*f(.8)):c.field840;
  if(c.field48*Math.abs(field6ac)>rate)field6ac=f((c.dt*sign(field6ac))*rate);
  if(c.contact){
   local420=inverseRotateMcmVector(matrix,c.normal45c);cacheValid=1;
   if(local420.some(v=>Math.abs(v)>f(.001))){matrix=rotateMcmTransformAtPivot(matrix,c.pivot,local420,field6ac);cacheValid=0;}
  }
 }
 return {matrix,angularVelocity,scratch540,axis624,local420,field6b0,field6a8,field6ac,cacheValid};
}
