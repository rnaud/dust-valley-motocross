import {selectMcmAiTrick} from '../../src/physics/mcm/ai-trick-select.js';
import {bitsFloat as float,floatBits as bits} from '../../src/physics/mcm/math.js';
import assert from 'node:assert/strict';import {computeMcmAiJumpState,AI_JUMP_OFFSETS} from '../../src/physics/mcm/ai-jump-state.js';import {createMcmRandom} from '../../src/physics/mcm/random.js';
// Stage-local mode-0 capture. Pose/stack inputs remain observed boundaries;
// this checks selected trick and startup flags, not the full animation graph.
export function analyzeAiTrickSelect(rows){
const rng=createMcmRandom(rows.find(r=>r.phase==='random').state);const nodes=new Map(rows.find(r=>r.phase==='route').nodes.map(n=>[n.address,n.words[9]]));let trickResult,expectedDelay,expectedAnimation,expectedControl;let selections=0,rejected=0;let pending=[],out,ids,calls=0,draws=0;const offsets=[0x514,0xb44,0xb64,0xb68,0xb40,0xb18,0xb20,0xb4c,0xb38];
for(const r of rows){
 if(r.phase==='lookahead-after'){
 const b=Buffer.from(r.hex,'hex'),w=new Uint32Array(34);ids=[0,b.readUInt32LE(0xb40),r.stack[12]];w[1]=0;w[2]=r.stack[33];w[3]=r.stack[32];w[4]=r.stack[22];w[5]=r.stack[13];w[6]=2;AI_JUMP_OFFSETS.forEach((o,i)=>w[7+i]=b.readUInt32LE(o));w[11]=w[11]?(ids[1]===ids[2]?2:1):0;w[32]=nodes.get(ids[1])||0;w[33]=nodes.get(ids[2])||0;
 out=computeMcmAiJumpState(w,{get state(){return rng.state;},get calls(){return rng.calls;},draw(){pending.push({state:rng.state,consumer:"jump"});return rng.draw();}});out[4]=ids[out[4]];if(ids[1])nodes.set(ids[1],out[9]);nodes.set(ids[2],out[10]);expectedDelay=b.readUInt32LE(0x81c);expectedAnimation=b[0x814];expectedControl=b.readUInt32LE(0x710);
 assert.equal(b.readUInt32LE(0xbf8),0,'Nearby branch absent in this fixture');
 if(w[7]&&out[7]&&(r.stack[30]|0)>=0x3f490fdb&&nodes.get(out[4])){
  trickResult=selectMcmAiTrick({flightTime:float(out[11]),selector:0,delayEnabled:b.readUInt32LE(0x614),delay:float(expectedDelay),selected:0},{draw(){pending.push({state:rng.state,consumer:"trick"});return rng.draw();}});
  expectedDelay=bits(trickResult.delay);out[7]=0;
  if(trickResult.success){expectedAnimation=trickResult.selected&255;expectedControl=1;selections++;}else rejected++;

 }

 }
 if(r.phase==='random'){
 if(pending.length){const expected=pending.shift();assert.equal(r.state,expected.state,'Predicted AI random state');assert.ok((expected.consumer==='jump'?[0x46f10b,0x46f14d,0x46f20a,0x46f3f2]:[0x49d741,0x49d7a8]).includes(r.caller),'Predicted random consumer');draws++;}else{assert.equal(r.inAi,0,'Unmodeled AI random draw');assert.equal(r.state,rng.state,'Shared random state');rng.draw();}
 }
 if(r.phase==='steering-control-before'){
 const b=Buffer.from(r.hex,'hex');for(let i=0;i<9;i++)assert.equal(out[i],b.readUInt32LE(offsets[i]),`seq ${r.sequence} field ${offsets[i].toString(16)}`);assert.equal(expectedDelay,b.readUInt32LE(0x81c),'Trick delay');assert.equal(expectedAnimation,b[0x814],'Selected trick animation');assert.equal(expectedControl,b.readUInt32LE(0x710),'Trick startup flag');assert.equal(out[11],r.stack[13],`flight ${r.sequence}`);assert.equal(pending.length,0);calls++;
 }
}
assert.equal(pending.length,0,'Unconsumed AI draws');assert.equal(calls,rows.filter(r=>r.phase==='lookahead-after').length,'Trick observation count');return {calls,draws,allDraws:rng.calls,selections,rejected};
}
