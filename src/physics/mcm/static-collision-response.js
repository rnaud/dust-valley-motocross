import {floatBits} from './math.js';
import {applyMcmBikeCollisionImpulse} from './bike-collision-impulse.js';
import {inverseRotateMcmVector,resolveMcmWorldMatrix} from './world-transform.js';
import {setMcmWorldMatrix} from './proxy-transform.js';
import {updateMcmCollisionGrid} from './collision-grid.js';
const f=Math.fround;
// Original 0x49d900 type 2, through the final event gate. Effects/audio/event
// boundaries are supplied explicitly; collision/physics/transform/grid are real.
export function respondMcmStaticCollision(c){
 const {bike,collision,grid}=c;
 if(c.emitEffect)c.emitEffect([...collision.contactCC],[0,12,0]);
 if(!bike.field8a8)bike.position=bike.position.map((x,i)=>f(x+collision.contactD8[i]));
 const lever=collision.contactCC.map((x,i)=>f(x-bike.position[i]));
 const localLever=inverseRotateMcmVector(resolveMcmWorldMatrix(bike.transform),lever);
 const scale=[f(.8),f(2.3),f(.7)],w=bike.worldAngularVelocity.map((x,i)=>f(x*scale[i]));
 bike.scratch540=[f(w[1]*lever[2]-w[2]*lever[1]),f(w[2]*lever[0]-w[0]*lever[2]),f(w[0]*lever[1]-w[1]*lever[0])];
 const contactVelocity=bike.scratch540.map((x,i)=>f(x+bike.velocity[i]));
 applyMcmBikeCollisionImpulse(bike,{normal:collision.contactE4,contactVelocity,lever,localLever,angularScale:scale,type:2,linearScale:0},c.notify);
 const [x,y,z]=bike.velocity,squared=(z*z+x*x)+y*y;
 bike.speed=squared===0?0:f(Math.sqrt(f(squared)));
 if((floatBits(bike.field564)|0)<0x3a83126f&&(floatBits(bike.speed)|0)<0x3dcccccd){bike.velocity=[0,0,0];bike.angularVelocity[1]=0;bike.speed=0;}
 collision.matrix=[...resolveMcmWorldMatrix(bike.transform)];
 if(!bike.state844)setMcmWorldMatrix(c.proxy,collision.matrix);
 updateMcmCollisionGrid(collision,grid,c.gridEnabled);
 if(!bike.state844&&!bike.field618){
  if(!c.onEvent)throw new Error('MCM static collision requires an event transition adapter');
  c.onEvent({bike,dynamic:0,impulse:0,collisionType:2,otherCrashed:0});
 }
}
