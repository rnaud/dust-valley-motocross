import {floatBits} from './math.js';

// Original 0x4b1320. Field names retain offsets where gameplay meaning is
// unresolved. Updates velocity and temporary vector, returning a turn angle.
export function updateMcmSteeringVelocity(c) {
  const f=Math.fround;
  let velocity=[...c.velocity],temporary=[...c.temporary];
  const radius=c.angle===0?0:f((c.field5d8/Math.sin(c.angle))*((c.a[1]*c.direction[1]+c.a[0]*c.direction[0])+c.a[2]*c.direction[2]));
  if(!(Math.abs(radius)>0))return {velocity,temporary,radius,turnAngle:0};
  const scale=((c.field560*c.field560)/-radius)*c.dt;
  const delta=c.direction.map(v=>f(v*scale));
  temporary=velocity.map((v,i)=>f(v+delta[i]));
  const [x,y,z]=temporary,sum=(x*x+y*y)+z*z;
  const speed=sum===0?0:f(Math.sqrt(f(sum)));
  if(Math.abs(speed)<f(.01))return {velocity,temporary,radius,turnAngle:0};
  const dot=(temporary[1]*velocity[1]+temporary[0]*velocity[0])+velocity[2]*temporary[2];
  const sign=floatBits(radius)>0x80000000?-1:1;
  const turnAngle=f(Math.abs(Math.acos(dot/(c.field564*speed)))*sign);
  if(!Number.isFinite(turnAngle))return {velocity,temporary,radius,turnAngle:0};
  velocity=temporary.map(v=>f(v*(c.field564/speed)));
  return {velocity,temporary,radius,turnAngle:c.field620?turnAngle:f(-turnAngle)};
}
