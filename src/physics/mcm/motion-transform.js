import {floatBits} from './math.js';
import {rotateMcmTransform,rotateMcmTransformAtPivot} from './transform.js';
import {prepareMcmRotation} from './rotation-step.js';

// Original 0x4ab49e..0x4ab7fd. Wheel components +0x48 scale supplied motion;
// +0x4c retains the last rotation increment, even when it is not applied.
export function updateMcmMotionTransform(c){
 const f=Math.fround,signed=x=>floatBits(x)|0;
 const wheels=c.wheels.map(w=>({...w,matrix:[...w.matrix]}));
 const apply=i=>{const w=wheels[i];if(Number.isFinite(w.angle)){w.matrix=rotateMcmTransform(w.matrix,[1,0,0],w.angle);w.cacheValid=0;}};
 const move=(i,distance)=>{wheels[i].angle=f(wheels[i].scale*distance);apply(i);};
 const freeRear=()=>{if(signed(c.engineLevel)<0x3f800000&&(floatBits(c.engineLevel)&0x7fffffff)!==0)wheels[1].angle=f(c.engineLevel*6);};
 if(!c.contact){
  if(c.state844===2)for(const w of wheels)w.angle=f(w.angle*f(.95));
  else if((floatBits(c.field5e4)&0x7fffffff)!==0)for(const w of wheels)w.angle=f(w.angle*(1-c.field5e4));
  else freeRear();
  apply(0);apply(1);
 }else{
  const signedDt=c.field620?c.dt:f(-c.dt);
  const rearMove=()=>{const delta=f(((c.inverseMass*c.field54)*c.dt)*c.field68);move(1,f(c.field738*signedDt+delta));};
  if(c.both){
   if(signed(c.field50)>0x3dcccccd)move(0,f(c.field50*signedDt));
   if(signed(c.field738)>0x3dcccccd)rearMove();
  }else if(c.front){move(0,f(c.field50*signedDt));freeRear();apply(1);}
  else {apply(0);rearMove();}
 }
 let matrix=[...c.matrix];matrix.splice(12,3,...c.position);
 const rotation=prepareMcmRotation({angularVelocity:c.angularVelocity,previousAxis:c.scratch540,dt:c.dt});
 if(rotation.apply)matrix=rotateMcmTransformAtPivot(matrix,c.previousPivot,rotation.axis,rotation.angle);
 return {matrix,wheels,axis:rotation.axis,angle:rotation.angle,apply:rotation.apply,cacheValid:0};
}
