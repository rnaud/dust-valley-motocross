import {floatBits} from './math.js';
import {applyMcmPairedCollisionImpulse} from './collision-pair-impulse.js';
import {rotateMcmWorldVector} from './collision-impulse.js';
import {inverseRotateMcmVector,resolveMcmWorldMatrix} from './world-transform.js';
import {setMcmWorldMatrix} from './proxy-transform.js';
import {updateMcmCollisionGrid} from './collision-grid.js';
const f=Math.fround;
const cross=(w,r)=>[f(w[1]*r[2]-w[2]*r[1]),f(w[2]*r[0]-w[0]*r[2]),f(w[0]*r[1]-w[1]*r[0])];
// Original 0x49d900 type 0/1 response; the other body's velocity destinations
// are deliberately disabled. Its own ordered callback applies its response.
export function respondMcmDynamicCollision(c){
 const {bike,other,collision,collisionType:type}=c;
 if(type!==0&&type!==1)throw new RangeError('Expected bike or rider collision');
 let transform=other.transform,position=other.position,velocity=other.velocity,angular=other.worldAngularVelocity;
 let mass=other.state844?other.alternateMass:other.inverseMass,inertia=other.state844?other.alternateInertia:other.inverseInertia,multiplier;
 if(type===1){
  mass=other.riderMass;inertia=other.riderInertia;multiplier=f(.2);
  if(other.state844){
   const rider=other.rider;transform=other.riderTransform;position=rider.position;
   const alternate=rider.flag13c||rider.flag140;
   velocity=alternate?rider.alternateVelocity:rider.velocity;angular=alternate?rider.alternateAngular:rider.angular;
  }
 }else{
  const angle=Math.abs(Math.atan2(collision.contactCC[0]-bike.position[0],collision.contactCC[2]-bike.position[2])-bike.heading);
  const folded=angle>Math.PI?f(f(angle)-f(2*Math.PI)):f(angle),bits=floatBits(folded)|0;
  multiplier=bits>0x4027ae14?f(.2):bits>0x4005c28f?f(.5):bits>0x3f060aa6?f(.8):1;
 }
 const otherLever=collision.contactCC.map((x,i)=>f(x-position[i]));
 const otherMotion=cross(angular,otherLever).map((x,i)=>f(x+velocity[i]));
 if(c.emitEffect&&type===0)c.emitEffect([...collision.contactCC],[0,12,0]);
 if(!bike.field8a8)bike.position=bike.position.map((x,i)=>f(x+collision.contactD8[i]));
 const lever=collision.contactCC.map((x,i)=>f(x-bike.position[i]));
 const localLever=inverseRotateMcmVector(resolveMcmWorldMatrix(bike.transform),lever);
 bike.scratch540=cross(bike.worldAngularVelocity,lever);
 const contactVelocity=bike.scratch540.map((x,i)=>f((x+bike.velocity[i])*multiplier));
 const pair={normal:collision.contactE4,restitution:bike.state844?f(.1):bike.restitution,updateB:false,
  a:{transform:bike.transform,inverseMass:bike.inverseMass,inverseInertia:bike.state844?bike.alternateInertia:bike.inverseInertia,contactVelocity,lever,angularVelocity:bike.angularVelocity,velocity:bike.velocity},
  b:{transform,inverseMass:mass,inverseInertia:inertia,contactVelocity:otherMotion.map(x=>f(x*multiplier)),lever:otherLever}};
 applyMcmPairedCollisionImpulse(pair);bike.velocity=pair.a.velocity;bike.angularVelocity=pair.a.angularVelocity;bike.field654=localLever;
 bike.worldAngularVelocity=rotateMcmWorldVector(resolveMcmWorldMatrix(bike.transform),bike.angularVelocity);c.notify?.(bike,pair.impulse,type);
 const [x,y,z]=bike.velocity,squared=(z*z+x*x)+y*y;bike.speed=squared===0?0:f(Math.sqrt(f(squared)));
 collision.matrix=[...resolveMcmWorldMatrix(bike.transform)];if(!bike.state844)setMcmWorldMatrix(c.proxy,collision.matrix);
 updateMcmCollisionGrid(collision,c.grid,c.gridEnabled);
 if(!bike.state844&&!bike.field618){
  if(!c.onEvent)throw new Error('MCM dynamic collision requires an event transition adapter');
  c.onEvent({bike,dynamic:1,impulse:pair.impulse,collisionType:type,otherCrashed:+!!other.state844});
 }
}
