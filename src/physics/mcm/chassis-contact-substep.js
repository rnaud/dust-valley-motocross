import {updateMcmBrakingSubstep} from './braking-substep.js';
import {transformMcmPoint} from './position-transform.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround;

// Original 0x4b0100..0x4b060f: merge the limited wheel and chassis contacts,
// calculate contact velocity, then apply the penetration correction.
export function resolveMcmChassisContacts(c){
 const s=c.chassisContact;
 const contacts=[
  [c.rearSuspension.contactLimited,c.points[7],c.rearSuspension.compression,c.points[5]],
  [c.frontSuspension.contactLimited,c.points[6],c.frontSuspension.compression,c.points[4]],
  [c.control1c,c.chassisWorld[0],c.chassisDepth[0],c.chassisNormals[0]],
  [c.control30,c.chassisWorld[1],c.chassisDepth[1],c.chassisNormals[1]],
 ];
 let count=0,depth=-9999;
 c.normal=[0,0,0];s.normal=[0,0,0];
 for(let j=0;j<4;j++){
  const [enabled,point,d,n]=contacts[j];if(!enabled)continue;
  if(j===0){c.normal=[...point];s.normal=[...n];depth=d;}
  else{
   if(j===1?!(depth>=d):d>depth)depth=d;
   c.normal=c.normal.map((v,i)=>f(add(v,point[i])));
   s.normal=s.normal.map((v,i)=>f(add(v,n[i])));
  }
  count++;
 }
 s.count=count;
 if(count>1){
  c.normal=c.normal.map(v=>f(mul(v,1/count)));
  const n=s.normal,sq=add(add(mul(n[1],n[1]),mul(n[2],n[2])),mul(n[0],n[0]));
  if(sq===0||Number.isNaN(sq))s.normal=[0,0,0];
  else {const inv=mcmInverseSqrt(f(sq));s.normal=n.map(v=>f(mul(v,inv)));}
 }
 s.arm=c.normal.map((v,i)=>f(sub(v,c.balanceCenter[i])));
 c.offset=c.normal.map((v,i)=>f(sub(v,c.bodyPosition[i])));
 const m=resolveMcmWorldMatrix(c.bodyNode),v=c.offset;
 // Preserve x87 exceptional arithmetic as well as the transpose-product order.
 c.frontLoad.localArm=[
  f(add(add(mul(m[1],v[1]),mul(m[2],v[2])),mul(m[0],v[0]))),
  f(add(add(mul(m[6],v[2]),mul(m[5],v[1])),mul(m[4],v[0]))),
  f(add(add(mul(m[9],v[1]),mul(m[10],v[2])),mul(m[8],v[0]))),
 ];
 c.offset=c.angularVelocity.map((v,i)=>f(mul(v,s.coefficients[i])));
 const a=c.offset,b=s.arm;
 s.velocity=[sub(mul(b[2],a[1]),mul(b[1],a[2])),sub(mul(a[2],b[0]),mul(b[2],a[0])),sub(mul(b[1],a[0]),mul(a[1],b[0]))].map((v,i)=>f(add(c.velocity[i],f(v))));
 c.offset=[0,depth,0];
 const n=s.normal,projection=add(add(mul(n[1],depth),mul(0,n[0])),mul(n[2],0));
 c.normal=n.map(v=>f(mul(v,projection)));
 c.bodyPosition=c.bodyPosition.map((v,i)=>f(add(v,c.normal[i])));
 c.balanceCenter=c.balanceCenter.map((v,i)=>f(add(v,c.normal[i])));
}

// Original caller 0x4a8be0..0x4a8ddf; non-contact path jumps to 0x4a9b29.
export function prepareMcmChassisContacts(c){
 const s=c.chassisContact;s.absTurn=Math.abs(c.frontLoad.turnAngle);
 s.enabled=+(!!c.rearSuspension.contactLimited||!!c.frontSuspension.contactLimited||!!c.control2c&&(!c.anyContact||!!c.state844));
 if(!s.enabled)return;
 s.coefficients=(c.state844?[.19,.19,.59]:[.79,.2,.3]).map(f);
 if(c.control2c&&c.control20!==1){
  if(c.control1c)c.chassisWorld[0]=transformMcmPoint(resolveMcmWorldMatrix(c.frontMountNode),c.chassisLocal[c.control1c===1?0:1]);
  if(c.control30)c.chassisWorld[1]=transformMcmPoint(resolveMcmWorldMatrix(c.bodyNode),c.chassisLocal[2]);
 }
 resolveMcmChassisContacts(c);
}
export function updateMcmChassisContactSubstep(c){
 const result=updateMcmBrakingSubstep(c);prepareMcmChassisContacts(c);return result;
}
