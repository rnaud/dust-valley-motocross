import test from 'node:test';
import assert from 'node:assert/strict';
import {track,trackAt,trackLength,nearestTrack,TAU} from '../src/track.js';

test('the circuit is a long closed loop with a consistent tangent',()=>{
 const a=track(0),b=track(TAU);
 assert.ok(trackLength>1200,'course should be a full-length circuit');
 assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-6);
 assert.ok(Math.hypot(a.tx,a.tz-0)<1e-6||Math.abs(Math.hypot(a.tx,a.tz)-1)<1e-6);
 for(const s of [0,.1,.25,.5,.75,.9]){
  const p=trackAt(s),q=trackAt(s+.001);
  assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>0);
  assert.ok(Math.abs(Math.hypot(p.tx,p.tz)-1)<1e-8);
 }
});

test('nearestTrack recovers the centreline and its distance',()=>{
 for(const s of [0,.07,.19,.33,.5,.68,.81,.95]){
  const p=trackAt(s),near=nearestTrack(p.x,p.z);
  assert.ok(near.distance<.05,`distance ${near.distance} at ${s}`);
  const delta=Math.abs(((near.s-s+.5)%1)-.5);
  assert.ok(delta<.01,`parameter ${near.s} vs ${s}`);
 }
 const outside=nearestTrack(400,400);
 assert.ok(outside.distance>100);
});

test('the course does not fold back onto itself',()=>{
 let closest=Infinity;
 const points=Array.from({length:180},(_,i)=>trackAt(i/180));
 for(let i=0;i<points.length;i++)for(let j=i+12;j<points.length;j++){
  if(Math.min(j-i,points.length-(j-i))<12)continue;
  closest=Math.min(closest,Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z));
 }
 assert.ok(closest>20,`non-adjacent centreline points only ${closest.toFixed(1)} m apart`);
});
