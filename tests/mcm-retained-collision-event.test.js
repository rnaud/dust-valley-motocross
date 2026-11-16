import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyMcmRetainedCollisionEvent} from '../src/physics/mcm/retained-collision-event.js';
import {createMcmEventGraph} from '../src/physics/mcm/event-graph.js';
import {respondMcmCollision} from '../src/physics/mcm/collision-callback.js';
import {evaluateDynamicCollision} from '../scripts/mcm-reference/dynamic-collision-response-case.mjs';
import {collisionEventWords} from '../scripts/mcm-reference/collision-event-case.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/collision-event-wine11.json',import.meta.url)));
function retainedContext(input,contact){
 const e=input.event,s=e.setup,a=contact.bike;
 const graph=createMcmEventGraph({...s,targetLocal:a.transform.local,targetWorld:a.transform.world,targetCache:a.transform.cacheValid});
 const randomValues=[...(e.launch?[e.rand0,e.rand1]:[]),...s.randomValues];let calls=0;
 const drawRandom=()=>{assert.ok(calls<randomValues.length);return randomValues[calls++];};
 const b={position:a.position,velocity:a.velocity,angularVelocity:a.angularVelocity,up:e.up,forward:s.forward,spawnPosition:e.target,
  inverseMass:a.inverseMass,offset:a.scratch540,normal:s.scratch54c,savedHeading:s.direction,boundsMin:s.liveBoundsMin,boundsMax:s.liveBoundsMax};
 Object.assign(b,{field6a4:a.speed,field564:a.field564,field844:a.state844,field8d0:a.field8d0,
  fieldc40:e.launch,field710:e.field710,field714:e.field714,field814:e.animation,field4bc:e.field4bc,field590:e.height0,field594:e.height1,field8ac:e.suppress,
  field8b8:e.eventKind,field8b4:e.reason,field8b0:e.otherPresent?0x1000:0,field8bc:e.counter,field820:e.field820,field4d8:e.angle4d8,field4f0:e.angle4f0,
  field86c:e.uprightThreshold,field8cc:e.time,field868:e.decel,field864:e.accel,field4e0:a.heading,field8a4:s.inverted,field890:s.field890,field884:s.resource,field878:s.normalResource,field880:s.alternateResource});
 return {bike:b,rider:{...structuredClone(s.rider),flag13c:s.rider.active13c},bodyNode:graph.target,baseNode:graph.source,
  effect:s.envelope,bounds:{min:s.boundsMin,max:s.boundsMax,components:graph.components,children:graph.boundsChildren},
  frameRider:{bikeAnimation:{frame:{index:e.frame}}},otherBikeVelocity:()=>e.otherVelocity,
  contactPhase:{normalEventDecision:{otherSpeed:e.otherSpeed,inputPresent:e.inputPresent,inputResult:e.inputResult,terrainMode:e.terrainMode,drawRandom,randomCalls:0,inputCalls:0},normalEventSetup:{records:s.records,drawRandom}}};
}
test('retained collision adapter matches all native event outputs after the real impulse and grid response',()=>{
 let checked=0;
 for(const {input,outputBits}of fixture.fixtures){
  let result,context;
  evaluateDynamicCollision(input,c=>respondMcmCollision({...c,onEvent:contact=>{context=retainedContext(input,contact);result=applyMcmRetainedCollisionEvent(context,contact);}}));
  assert.ok(result);assert.deepEqual(collisionEventWords(result),outputBits.slice(-104),`native collision case ${checked}`);
  assert.equal(context.bike.field844,result.state);assert.equal(context.bike.field8b4,result.reason);assert.equal(context.bike.field8b8,result.eventKind);
  assert.deepEqual(context.rider.selected,result.rider.selected);assert.equal(context.rider.flag13c,result.rider.active13c);
  assert.equal(context.contactPhase.normalEventDecision.randomCalls,result.randomCalls);checked++;
 }
 assert.equal(checked,398);
});
