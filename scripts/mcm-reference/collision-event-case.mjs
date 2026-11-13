import {evaluateDynamicCollision} from './dynamic-collision-response-case.mjs';
import {respondMcmCollision} from '../../src/physics/mcm/collision-callback.js';
import {applyMcmCollisionEvent} from '../../src/physics/mcm/collision-event.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function collisionEventWords(r){
return [r.triggered,r.eventKind,r.reason,r.otherPresent,r.field710,r.field714,...[...r.velocity,...r.angularVelocity].map(floatBits),r.randomCalls,r.inputCalls,r.state,r.field820,r.animation,...[...r.envelope,...r.direction].map(floatBits),r.inverted,floatBits(r.field890),r.resource,...[...r.boundsMin,...r.boundsMax,...r.scratch540,...r.scratch54c,...r.target.local,...r.target.world,...r.source.world].map(floatBits),r.source.cacheValid,r.target.cacheValid,...[...r.rider.velocity,...r.rider.angularVelocity,...r.rider.previousVelocity].map(floatBits),...r.rider.selected,r.rider.active13c,r.rider.active16c,r.rider.kind];
}
export function evaluateCollisionEvent(c){
 let result;
 const collisionWords=evaluateDynamicCollision(c,context=>respondMcmCollision({...context,onEvent:contact=>{result=applyMcmCollisionEvent(contact,c.event);}}));
 if(!result)throw new Error('Expected final event call');
 return [...collisionWords,...collisionEventWords(result)];
}
