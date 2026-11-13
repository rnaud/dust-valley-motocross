import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {calculateMcmContactTorque} from './contact-torque.js';
import {updateMcmSuspensionForceSubstep} from './suspension-force-substep.js';
const f=Math.fround;
function cross(a,b){
 const v=new Float64Array(3);
 v[0]=f(sub(mul(a[1],b[2]),mul(b[1],a[2])));
 v[1]=f(sub(mul(b[0],a[2]),mul(b[2],a[0])));
 v[2]=f(sub(mul(b[1],a[0]),mul(b[0],a[1])));return v;
}
function inverse(c,v){
 const m=resolveMcmWorldMatrix(c.bodyNode),r=new Float64Array(3);
 r[0]=f(add(add(mul(m[1],v[1]),mul(m[2],v[2])),mul(m[0],v[0])));
 r[1]=f(add(add(mul(m[6],v[2]),mul(m[5],v[1])),mul(m[4],v[0])));
 r[2]=f(add(add(mul(m[9],v[1]),mul(m[10],v[2])),mul(m[8],v[0])));return r;
}

// Original single-wheel branches 0x4a9d5c..0x4aa573 / 0x4aaa55.
// Both-wheel force assembly begins at 0x4aa573 and is handled separately.
export function assembleMcmSingleContactForces(c){
 if(c.state844&&c.chassisContact.enabled)return;
 const s=c.singleContactForce;
 if(!c.anyContact){c.chassisResponse.localLever=new Float64Array(c.localBalanceCenter);s.torque=[0,0,0];return;}
 if(c.bothContact)return;
 const front=!!c.frontContact,load=front?c.frontLoad:c.rearLoad,motion=front?c.frontMotion:c.rearMotion;
 const normal=c.points[front?4:5],spring=c.suspensionForces[front?'front':'rear'].force;
 const normalForce=normal.map(v=>f(mul(v,motion.normalLoad)));
 s[front?'frontNormal':'rearNormal']=normalForce;
 // Preserve the original two partial float stores in the world-up projection.
 const k=front?0:2;s.partials[k]=f(mul(0,spring[2]));s.partials[k+1]=f(add(mul(1,spring[1]),mul(0,spring[0])));
 const projection=f(add(s.partials[k+1],s.partials[k]));
 const projected=[0,1,0].map(v=>f(mul(v,projection)));
 s[front?'frontProjection':'rearProjection']=projected;
 c.offset=projected.map(v=>f(mul(v,c.targetRollCos)));
 load.force=load.force.map((v,i)=>f(add(c.offset[i],v)));
 load.force=load.force.map((v,i)=>f(add(v,normalForce[i])));
 c.force=c.force.map((v,i)=>f(add(load.force[i],v)));
 c.normal=cross(load.arm,load.force);s.torque=inverse(c,c.normal);
 if(front){
  if((floatBits(s.torque[0])|0)>0){
   s.torque[0]=0;c.chassisResponse.angularXY[0]=f(mul(c.chassisResponse.angularXY[0],f(.96)));
   if(floatBits(c.riderLean)<0xbf666666)s.counter=(s.counter+1)>>>0;
  }else s.counter=0;
 }else{
  if(floatBits(s.torque[0])>0x80000000){
   s.torque[0]=0;if((floatBits(c.riderLean)|0)>0x3f666666)s.counter=(s.counter+1)>>>0;
  }else{
   const raw=mul(c.heights[0],f(-.7));s.rearScale[0]=f(raw);s.rearScale[1]=raw<f(1.05)||Number.isNaN(raw)?s.rearScale[0]:f(1.05);
   s.torque[0]=f(mul(s.torque[0],s.rearScale[1]));s.counter=0;
  }
  c.force=c.force.map((v,i)=>f(add(c.frontLoad.scratch354[i],v)));
  const drive=calculateMcmContactTorque({a:c.rearLoad.arm,b:c.frontLoad.scratch354,field4dc:c.pitch,angularVelocityX:c.chassisResponse.angularXY[0],ai:c.drive.ai,flag:c.frontContact,field6ec:c.riderLean,component44:c.componentAngle});
  s.driveTorque=drive.torque;c.chassisResponse.angularXY[0]=drive.angularVelocityX;
  c.offset=inverse(c,s.driveTorque);s.torque=s.torque.map((v,i)=>f(add(c.offset[i],v)));
 }
 c.offset=c.points[front?6:7].map((v,i)=>f(sub(v,c.bodyPosition[i])));
 c.chassisResponse.localLever=inverse(c,c.offset);
}
export function updateMcmSingleContactForceSubstep(c){
 const result=updateMcmSuspensionForceSubstep(c);assembleMcmSingleContactForces(c);return result;
}
