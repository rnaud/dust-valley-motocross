import test from 'node:test';
import assert from 'node:assert/strict';
import {connectMcmOtherBikeState} from '../src/physics/mcm/other-bike-state.js';
import {decideMcmBikeEvent} from '../src/physics/mcm/event-decision.js';

test('other-bike reads follow current shared velocity, speed and pointer after impulses',()=>{
 const c={bike:{field8b0:0}},other={kind:'bike',velocity:[10,0,0],speed:10},actors=new Map([[0x1000,other]]),state=connectMcmOtherBikeState(c,actors);
 assert.equal(state.speed,0);assert.deepEqual(c.otherBikeVelocity(),[0,0,0]);
 c.bike.field8b0=0x1000;assert.equal(state.speed,10);assert.deepEqual(c.otherBikeVelocity(),[10,0,0]);
 other.velocity=[-20,0,0];other.speed=20;
 assert.equal(state.speed,20);assert.deepEqual(c.otherBikeVelocity(),[-20,0,0]);
 const copy=c.otherBikeVelocity();copy[0]=99;assert.equal(other.velocity[0],-20);
 c.bike.field8b0=0;assert.equal(state.speed,0);
 c.bike.field8b0=0x2000;assert.throws(()=>state.speed,/Missing live other bike/);assert.throws(()=>c.otherBikeVelocity(),/Missing live other bike/);
});
test('live other-bike direction selects the matching native event branch instead of a zero-vector fallback',()=>{
 const c={bike:{field8b0:0x1000}},other={kind:'bike',velocity:[10,0,0],speed:10},state=connectMcmOtherBikeState(c,new Map([[0x1000,other]]));
 const input={eventKind:0,reason:0,otherPresent:1,field710:0,field714:0,velocity:[10,0,0],angularVelocity:[0,0,1],speed:10,previousSpeed:10,up:[0,1,0],uprightThreshold:0.5,field4bc:0,field820:1,counter:0,suppress:0,launch:0,inputPresent:0};
 const decide=()=>decideMcmBikeEvent({...input,otherSpeed:state.speed,otherVelocity:c.otherBikeVelocity()});
 assert.equal(decide().reason,2);assert.equal(decide().eventKind,1);
 other.velocity=[-10,0,0];assert.equal(decide().eventKind,3);
});
