import assert from 'node:assert/strict';
import {replayAiEntry} from './analyze-ai-entry.mjs';
import {analyzeAiRouteTargets} from './analyze-ai-route-target.mjs';
import {replayAiRaceHandicap} from './analyze-ai-race-handicap.mjs';
import {analyzeAiAvoidanceScan} from './analyze-ai-avoidance-scan.mjs';
import {analyzeAiLookahead} from './analyze-ai-lookahead.mjs';
import {replayAiLandingPitch} from './analyze-ai-landing-pitch.mjs';
import {replayAiSteeringControl} from './analyze-ai-steering-control.mjs';
import {analyzeAiThrottle} from './analyze-ai-throttle.mjs';
import {replayAiMotion} from './analyze-ai-motion.mjs';
import {replayAiAllocations} from './analyze-ai-allocations.mjs';
import {replayAiTrickGraph} from './analyze-ai-trick-graph.mjs';
import {floatBits as bits} from '../../src/physics/mcm/math.js';
// Complete per-call body comparison. Pose and outer-frame inputs still come
// from controller entry; this is not a replacement for retained world replay.
// Every written value below comes from a recovered routine, never exit bytes.
export function analyzeAiControllerBody(rows,options){
 assert.ok(rows.filter(r=>r.phase==='race-context').every(r=>r.mode===0),'Complete body replay requires mode 0');
 const indexed=r=>new Map(r.checks.map(c=>[c.sequence,c]));
 const entry=indexed(replayAiEntry(rows)),targets=indexed(analyzeAiRouteTargets(rows)),race=indexed(replayAiRaceHandicap(rows)),avoid=indexed(analyzeAiAvoidanceScan(rows,options)),look=indexed(analyzeAiLookahead(rows,options)),jump=indexed(replayAiLandingPitch(rows,options)),steer=indexed(replayAiSteeringControl(rows,options)),throttle=indexed(analyzeAiThrottle(rows,options)),motion=indexed(replayAiMotion(rows,options)),allocation=indexed(replayAiAllocations(rows));
 const tricks=rows.some(r=>r.phase==='trick-graph-before')?indexed(replayAiTrickGraph(rows)):new Map();
 let calls=0,changedWords=0;const changedOffsets=new Set();
 for(const before of rows.filter(r=>r.phase==='before')){
  const sequence=before.sequence,original=Buffer.from(before.hex,'hex'),expected=Buffer.from(original),after=rows.find(r=>r.phase==='after'&&r.sequence===sequence);
  assert.equal(expected.length,0xcc8);assert.ok(after,'Missing complete controller exit');assert.equal(after.bike,before.bike);
  const write=(offset,value)=>expected.writeUInt32LE(value>>>0,offset),values=(offsets,words)=>offsets.forEach((offset,i)=>write(offset,words[i]));
  write(0xc44,entry.get(sequence).jumpCount);values([0xafc,0xc3c],targets.get(sequence).words.slice(2,4));write(0xba8,bits(race.get(sequence).scale));
  write(0x40c,allocation.get(sequence).ownerBytes);
  if(!original.readUInt32LE(0x4bc))write(0xb48,avoid.get(sequence).words[4]);
  const l=look.get(sequence).words;values([0xb80,0xb84,0xb88],l);write(0xb8c,l[7]);
  const j=jump.get(sequence);values([0x514,0xb44,0xb64,0xb68,0xb40,0xb18,0xb20,0xb4c,0xb38],j.bodyWords);write(0x81c,j.trickDelay);write(0x710,j.trickControl);expected.writeUInt8(j.trickAnimation,0x814);
  const trick=tricks.get(sequence);
  if(trick){
   // Only the original trick routine's body write set is applied. Its other
   // entry fields are checked by stage replay and cannot overwrite this body.
   for(const offset of [4,0x10,0x14,0x30,0x2c,0x820,0x710,0x818,0xb4c,0x218,0x21c,0x220,0x224,0x228,0x22c,0x540,0x544,0x548,0x54c,0x550,0x554])write(offset,trick.body.readUInt32LE(offset));
   expected.writeUInt8(trick.body[0x814],0x814);
  }
  write(0x6f4,steer.get(sequence).steering);values([0xb04,0xb08,0x6ec],throttle.get(sequence).words);
  const m=motion.get(sequence);values(m.offsets,m.words);
  const observed=Buffer.from(after.hex,'hex');assert.equal(observed.length,expected.length);
  for(let offset=0;offset<expected.length;offset+=4){assert.equal(expected.readUInt32LE(offset),observed.readUInt32LE(offset),`Complete controller body ${sequence} field ${offset.toString(16)}`);if(expected.readUInt32LE(offset)!==original.readUInt32LE(offset)){changedWords++;changedOffsets.add(offset);}}
  calls++;
 }
 assert.ok(calls,'Missing complete controller calls');assert.equal(calls,rows.filter(r=>r.phase==='after').length);
 return {calls,comparedBytes:calls*0xcc8,changedWords,changedOffsets:[...changedOffsets].sort((a,b)=>a-b).map(o=>o.toString(16))};
}
