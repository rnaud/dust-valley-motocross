import {transitionMcmBikeEvent} from './event-transition.js';

// Adapter for the final 0x49d900 -> 0x4a4b60 call. Event inputs must observe
// the already-applied collision impulse and transform/grid synchronization.
export function applyMcmCollisionEvent(contact,event){
 const {bike,dynamic,impulse,collisionType,otherCrashed}=contact;
 const setup={...event.setup,targetLocal:bike.transform.local,targetWorld:bike.transform.world,targetCache:bike.transform.cacheValid,field4e0:bike.heading,scratch540:bike.scratch540};
 const result=transitionMcmBikeEvent({...event,position:bike.position,velocity:bike.velocity,angularVelocity:bike.angularVelocity,speed:bike.speed,previousSpeed:bike.field564,invMass:bike.inverseMass,state:bike.state844,
  arg1:0,arg2:0,arg7:1,arg8:bike.field8d0,arg9:dynamic,arg10:impulse,arg11:collisionType,arg12:otherCrashed,setup});
 bike.velocity=result.velocity;bike.angularVelocity=result.angularVelocity;
 bike.state844=result.state;bike.scratch540=result.scratch540;
 Object.assign(bike.transform,{local:result.target.local,world:result.target.world,cacheValid:result.target.cacheValid});
 return result;
}
