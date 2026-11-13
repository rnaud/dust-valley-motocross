import {mcmAdd as add,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
import {floatBits} from './math.js';

// Original 0x4abb30..0x4abef9. Gate exits at 0x4ac64a / 0x4ac1f7.
// Later orientation/timer logic is separate. Field names remain provisional.
export function updateMcmStateZeroControl(c){
 const f=Math.fround,signed=x=>floatBits(x)|0;
 let redirected=false;
 let controlVector=[...c.controlVector],scratch540=[...c.scratch540],scratch54c=[...c.scratch54c],velocity=[...c.velocity],speed=c.speed,angularVelocity=new Float64Array(c.angularVelocity);
 if(c.limitedFirst||c.limitedSecond||!c.field4bc)return {controlVector,scratch540,scratch54c,velocity,speed,angularVelocity,redirected};
 const rawStep=c.dt*f(.83),step=f(rawStep),pitch=f(rawStep*c.control);
 let yaw=f((c.field6f4*c.dt)*f(-.2));
 if(c.field820)yaw=f((yaw*.5)*Math.abs((c.field730-.5)*2)+yaw);
 controlVector=c.field710?[f(pitch*.5),0,0]:[pitch,yaw,0];
 if(c.field820&&floatBits(c.field594)>0xc0000000){
  if(!(c.fieldc68&8)){
   if(signed(c.field5e4)>0)controlVector[0]=f(c.field5e4*step+controlVector[0]);
   if(c.field6fc&&signed(c.engineLevel)>0)controlVector[0]=f(controlVector[0]-c.engineLevel*step);
  }
  const inverse=div(1,speed);scratch540=velocity.map(v=>f(mul(v,inverse)));
  const [x,y,z]=scratch540,b=c.forward;
  const rawDot=add(add(mul(b[1],y),mul(b[0],x)),mul(b[2],z)),dot=f(rawDot);
  if(rawDot>f(.55)&&signed(dot)<0x3f7c28f6){
   redirected=true;
   scratch54c=[z,0,f(-x)];
   const sign=signed(c.field730)<0x3f000000?-1:1;
   const amount=(((((1-dot)*f(3.4129691123962402))*speed)*f(.05))*c.dt)*sign;
   velocity=velocity.map((v,i)=>f(add(mul(scratch54c[i],amount),v)));
   const scale=div(speed,add(amount,speed));velocity=velocity.map(v=>f(mul(v,scale)));
   const [vx,vy,vz]=velocity,squared=add(add(mul(vz,vz),mul(vx,vx)),mul(vy,vy));speed=squared===0||Number.isNaN(squared)?0:f(Math.sqrt(f(squared)));
  }
 }
 angularVelocity=angularVelocity.map(v=>f(mul(v,f(.9))));
 return {controlVector,scratch540,scratch54c,velocity,speed,angularVelocity,redirected};
}
