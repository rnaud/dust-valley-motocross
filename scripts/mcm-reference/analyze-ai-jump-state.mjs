import assert from 'node:assert/strict';import {computeMcmAiJumpState,AI_JUMP_OFFSETS} from '../../src/physics/mcm/ai-jump-state.js';import {createMcmRandom} from '../../src/physics/mcm/random.js';
// Stage-local validation: body and stack inputs are observed boundaries.
// b4c is intentionally not asserted at the later steering boundary: the
// intervening 49d6a0/trick dispatch can change it. Its isolated output is tested.
export function analyzeAiJumpState(rows){
const rng=createMcmRandom(rows.find(r=>r.phase==='random').state);let pending=[],out,ids,calls=0,draws=0;const offsets=[0x514,0xb44,0xb64,0xb68,0xb40,0xb18,0xb20,0xb4c,0xb38];
for(const r of rows){
 if(r.phase==='lookahead-after'){
 const b=Buffer.from(r.hex,'hex'),w=new Uint32Array(34);ids=[0,b.readUInt32LE(0xb40),r.stack[12]];w[1]=0;w[2]=r.stack[33];w[3]=r.stack[32];w[4]=r.stack[22];w[5]=r.stack[13];w[6]=2;AI_JUMP_OFFSETS.forEach((o,i)=>w[7+i]=b.readUInt32LE(o));w[11]=w[11]?1:0;
 out=computeMcmAiJumpState(w,{get state(){return rng.state;},get calls(){return rng.calls;},draw(){pending.push(rng.state);return rng.draw();}});out[4]=ids[out[4]];
 }
 if(r.phase==='random'){
 if(pending.length){assert.ok([0x46f10b,0x46f14d,0x46f20a,0x46f3f2].includes(r.caller),'Jump random caller');assert.equal(r.state,pending.shift(),'predicted jump random');draws++;}else{assert.equal(r.state,rng.state,'shared random state');rng.draw();}
 }
 if(r.phase==='steering-control-before'){
 const b=Buffer.from(r.hex,'hex');for(let i=0;i<9;i++)if(i!==7)assert.equal(out[i],b.readUInt32LE(offsets[i]),`seq ${r.sequence} field ${offsets[i].toString(16)}`);assert.equal(out[11],r.stack[13],`flight ${r.sequence}`);assert.equal(pending.length,0);calls++;
 }
}
assert.equal(pending.length,0,'Unconsumed jump draws');assert.equal(calls,rows.filter(r=>r.phase==='lookahead-after').length,'Jump observation count');return {calls,draws,allDraws:rng.calls};
}
