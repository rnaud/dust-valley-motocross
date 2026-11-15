import assert from 'node:assert/strict';
import {analyzeAiLookahead} from './analyze-ai-lookahead.mjs';
import {computeMcmAiSteeringControl} from '../../src/physics/mcm/ai-steering-control.js';
import {prepareMcmFrameInput} from '../../src/physics/mcm/frame-input.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
// Crash occurrence remains an observed outer-frame boundary. Its zeroing
// behavior is computed by the existing frame-input routine, not reseeded.
export function analyzeAiSteeringControl(rows,options){
 const recovered=analyzeAiLookahead(rows,options),bike=rows.find(r=>r.phase==='before').bike;
 let steering,calls=0,clears=0,pending;
 for(const r of rows){
  if(r.phase==='before'){const b=Buffer.from(r.hex,'hex');steering??=b.readUInt32LE(0x6f4);assert.equal(steering,b.readUInt32LE(0x6f4),'Retained steering entry');}
  if(r.phase==='crash-control-clear'&&r.bike===bike&&steering!==undefined){
   assert.equal(steering,r.previous,'Crash clear prior');const c={bike:{field844:1,fieldb6c:0,field6f4:float(steering)},frameEntry:{}};assert.equal(prepareMcmFrameInput(c,{}).branch,'crash');steering=bits(c.bike.field6f4);assert.equal(steering,r.value,'Computed crash clear');clears++;
  }
  if(r.phase==='steering-control-before'){
   assert.equal(r.bike,bike);assert.equal(steering,Buffer.from(r.hex,'hex').readUInt32LE(0x6f4),'Steering stage entry');
   const entry=rows.find(e=>e.phase==='before'&&e.sequence===r.sequence),computed=recovered.checks.find(e=>e.sequence===r.sequence);assert.equal(r.dtBits,entry.dtBits,'Steering timestep');
   pending=computeMcmAiSteeringControl({dt:float(entry.dtBits),difference:float(computed.words[4]),current:float(steering)});steering=bits(pending.steering);
  }
  if(r.phase==='steering-control-after'){assert.equal(steering,Buffer.from(r.hex,'hex').readUInt32LE(0x6f4),'Computed steering output');assert.equal(bits(pending.absoluteDifference),r.stack[13],'Computed absolute difference');}
  if(r.phase==='after'){assert.equal(steering,Buffer.from(r.hex,'hex').readUInt32LE(0x6f4),'Retained steering exit');calls++;}
 }
 assert.equal(calls,recovered.calls);for(const phase of ['steering-control-before','steering-control-after'])assert.equal(rows.filter(r=>r.phase===phase).length,calls,'Steering observation count');
 return {calls,clears,targetChanges:recovered.targetChanges,steeringChanges:recovered.steeringChanges};
}
