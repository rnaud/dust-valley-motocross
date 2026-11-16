import {floatBits,bitsFloat} from './math.js';
import {projectMcmCameraPoint} from './camera-point.js';
import {rotateMcmRuntimeVector} from './runtime-vector-rotation.js';
import {stepMcmOffsetChase} from './chase-offset.js';
const f=Math.fround,pi=f(Math.PI),tau=f(2*Math.PI);
// 0x47caf1..0x47d166, after the rider node's world-position query.
export function deriveMcmAlternateEye(camera,input,delta,axis){
 const dt=f(delta),point=Float32Array.from(input.riderPoint),base=Float32Array.from(input.base);
 const target=Float32Array.from(point,(v,i)=>f((base[i]-v)*f(.38)+v));
 if(floatBits(camera.orbitAngle)>0xc1000000){
  camera.orbitAngle=f(camera.orbitAngle+16);camera.height=7;
  if(floatBits(camera.orbitAngle)>0x80000000){
   camera.pitch=0;camera.yaw=0;
   camera.orbitAngle=bitsFloat(camera.orbitAngle<-Math.PI/2?0xc005fd6c:0xbf8624dd);
  }else camera.orbitAngle=bitsFloat(camera.orbitAngle>Math.PI/2?0x4005fd6c:0x3f8624dd);
  camera.orbitAngle=f(camera.orbitAngle+f(input.bike890));
  if(input.bike8a4)camera.orbitAngle=f(camera.orbitAngle+pi);
  if(!(camera.orbitAngle<2*Math.PI))camera.orbitAngle=f(camera.orbitAngle-tau);
 }
 const rider=projectMcmCameraPoint(input.matrix,point,input.width,input.height);
 const bike=rider.visible?projectMcmCameraPoint(input.matrix,base,input.width,input.height):null;
 const outside=!rider.visible?rider:!bike.visible?bike:null;
 if(outside){
  camera.radius=f(dt*80+camera.radius);
  if(outside.flags===1||outside.flags===2){
   camera.yaw=f(dt*(outside.flags===1?-3:3)+camera.yaw);
   if((floatBits(camera.yaw)|0)>0x40490fdb)camera.yaw=f(camera.yaw-tau);
   else if(floatBits(camera.yaw)>0xc0490fdb)camera.yaw=f(camera.yaw+tau);
  }else if(outside.flags===4){
   if(input.bike8b4!==6)camera.height=f(dt*5+camera.height);
   else{
    camera.height=f(camera.height+dt*(rider.visible?1:2.5));
    camera.pitch=f(camera.pitch+dt*-2.5);
    if((floatBits(camera.pitch)|0)>0x3fc66666)camera.pitch=bitsFloat(0x3fc66666);
    else if(floatBits(camera.pitch)>0xbfc66666)camera.pitch=bitsFloat(0xbfc66666);
   }
  }else if(outside.flags===8)camera.height=f(camera.height-dt*(input.bike8b4===6?4:5));
 }else if(!input.rider13c&&!input.rider140){
  const a=rider.screen,b=bike.screen;
  if(Math.abs(a[0]-b[0])<(input.boundWidth|0)*f(.1)&&Math.abs(a[1]-b[1])<(input.boundHeight|0)*f(.1)){
   let depth=b[2]<=a[2]||Number.isNaN(b[2])||Number.isNaN(a[2])?b[2]:a[2];
   if((floatBits(depth)|0)>0x43a78000)depth=335;
   camera.radius=f(camera.radius-(depth-15)*dt*f(.028));
   if((floatBits(camera.radius)|0)<0x41a00000)camera.radius=20;
  }
 }
 const rotated=rotateMcmRuntimeVector(input.reference,axis,f(camera.yaw+camera.orbitAngle));
 const offset=Float32Array.from(rotated,v=>f(v*-camera.radius)),eye=Float32Array.from(target,(v,i)=>f(offset[i]+v));
 eye[1]=f(camera.height+eye[1]);
 return {target,eye,offset};
}
export function stepMcmAlternateEye(state,input,delta){
 if(!input.alternate)throw Error('Missing retained alternate-eye crash-camera inputs');
 state.restoreFlag=1;
 const result=deriveMcmAlternateEye(state.camera,{...input.alternate,base:input.base,bike8b4:input.bike8b4,rider140:input.rider140},delta,state.axis);
 return {...stepMcmOffsetChase(state,{...input,previousTarget:result.target,eye:result.eye,offset:result.offset},delta),rawEye:result.eye,factor:0};
}
