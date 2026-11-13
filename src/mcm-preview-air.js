import {Matrix4,Quaternion,Vector3} from 'three';
import {updateMcmContactResponse} from './physics/mcm/contact-response.js';
import {updateMcmStateZeroControlRotation} from './physics/mcm/state-zero-rotation.js';
import {extractMcmOrientationAngles} from './physics/mcm/orientation-angles.js';
import {inverseRotateMcmVector} from './physics/mcm/world-transform.js';
import {rotateMcmWorldVector} from './physics/mcm/collision-impulse.js';
import {floatBits,bitsFloat} from './physics/mcm/math.js';
const f=Math.fround,FT=.3048;

// Captured PDM rider/controller defaults. Animation-dependent trick states are
// not synthesized by this preview adapter. fieldc6c retains original DWORD bits.
export function createMcmPreviewAir(){
 return {field4bc:0,field870:0,field718:0,field714:0,field8c4:0,fieldb4c:0,
  fieldc6c:0,fieldc70:0,fieldc74:0,fieldc78:0,responseScratch:[0,0,0,0],
  field710:0,field730:.5,field820:0,field6fc:0,fieldc68:0};
}

// The recovered stage follows motion integration. Cannon supplies contacts and
// the body transform; its origin substitutes for the original balance reference.
export function stepMcmPreviewAir(c,{position,quaternion,velocity,angularVelocity,
 frontContact=false,rearContact=false,chassisContact=false,lean=0,steer=0,brake=0,engineLevel=0,dt}){
 const q=new Quaternion(quaternion.x,quaternion.y,quaternion.z,quaternion.w);
 const matrix=new Matrix4().compose(new Vector3(...position.map(x=>f(x/FT))),q,new Vector3(1,1,1)).elements.map(f);
 const forward=matrix.slice(8,11),up=matrix.slice(4,7),angles=extractMcmOrientationAngles(forward,up);
 const localAngular=inverseRotateMcmVector(matrix,angularVelocity.map(f));
 Object.assign(c,{state844:0,anyContact:frontContact||rearContact,frontContact,rearContact,
  control1c:+chassisContact,control30:0,roll:angles.roll,field53c:localAngular[2],field8c4:0});
 updateMcmContactResponse(c);
 c.field4bc=+(!c.anyContact&&!chassisContact);
 if(!c.field4bc)return {active:false};
 c.field870=0;
 const v=velocity.map(x=>f(x/FT));
 const r=updateMcmStateZeroControlRotation({
  ...c,limitedFirst:false,limitedSecond:false,controlVector:[0,0,0],scratch540:[0,0,0],scratch54c:[0,0,0],
  velocity:v,speed:f(Math.hypot(...v)),angularVelocity:localAngular,dt:f(dt),control:f(-lean),field6f4:f(steer),
  field594:0,field5e4:f(brake),engineLevel:f(engineLevel),forward,
  timer:bitsFloat(c.fieldc6c),previousSign:c.fieldc70,accumulator:c.fieldc74,phase:c.fieldc78,
  field4d8:angles.roll,field48:f(1/f(dt)),matrix,pivot:[0,0,0],cacheValid:1,
 });
 c.fieldc6c=floatBits(r.timer);c.fieldc70=r.previousSign;c.fieldc74=r.accumulator;c.fieldc78=r.phase;
 // Returning to Cannon's quaternion is an adapter, not original matrix storage.
 const rotation=new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(r.matrix)).normalize();
 return {active:true,applied:r.applied,quaternion:rotation,position:r.matrix.slice(12,15).map(x=>x*FT),
  velocity:r.velocity.map(x=>x*FT),angularVelocity:Array.from(rotateMcmWorldVector(r.matrix,r.angularVelocity)),
  localAngularVelocity:Array.from(r.angularVelocity),roll:angles.roll,angle:r.angle};
}
