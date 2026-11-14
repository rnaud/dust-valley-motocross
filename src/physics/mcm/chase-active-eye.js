import {rotateMcmRuntimeVector} from './runtime-vector-rotation.js';
import {stepMcmOffsetChase} from './chase-offset.js';
const f=Math.fround;
// Active path 0x47c7d2..0x47cabb, then the offset/smoothing chain.
// Earlier source, base, heading and control gates remain supplied.
export function stepMcmActiveChase(state,input,delta){
 const source=Float32Array.from(input.source),axis=Float32Array.of(source[2],0,-source[0]),camera=state.camera;
 const tilted=rotateMcmRuntimeVector(source,axis,camera.pitch);
 const rotated=rotateMcmRuntimeVector(tilted,state.axis,input.heading);
 const offset=Float32Array.from(rotated,x=>f(x*-f(camera.radius)));
 const eye=Float32Array.from(offset,(x,i)=>f(f(input.base[i])+x));
 let reset=false;
 if(!input.eyeGate)state.eyeResetFlag=0;
 else{
  const fast=(input.speedBits|0)>0x3ba3d70a;
  if(!fast&&input.motionGate)state.eyeResetFlag=0;
  else if(!state.eyeResetFlag){
   const threshold=fast?10:f(.01);
   reset=[0,2,1].every(i=>!(Math.abs(state.filters[i+3][0]-eye[i])>=threshold));
   if(reset){
    const time=input.actorType===1?.25:f(.3);
    for(const i of [0,1,2]){state.filters[i+3][0]=eye[i];state.filters[i+3][1]=time;}
    state.eyeResetFlag=1;
   }
  }
 }
 let factor=f(input.factor);
 if(input.crashed)factor=f(factor*f(.8));
 else if(input.mode!==6){camera.orbitAngle=f(f(input.heading)-16);camera.backup=Float32Array.of(camera.radius,camera.pitch,camera.yaw);}
 return {...stepMcmOffsetChase(state,{...input,eye,offset,factor},delta),rawEye:eye,reset,factor};
}
