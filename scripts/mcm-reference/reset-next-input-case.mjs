import {evaluateResetNextRecovery} from './reset-next-recovery-case.mjs';
import {prepareMcmFrameInput} from '../../src/physics/mcm/frame-input.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetNextInput(input,observe){
 let words,inputBranch;
 const result=evaluateResetNextRecovery(input,c=>{
  const b=c.bike,before=[b.field710>>>0,b.field714>>>0,c.frameRider.riderAnimation.stopped>>>0,b.field814>>>0];
  const r=prepareMcmFrameInput(c,input.frameInput);inputBranch=r.branch;
  words=[['crash','player','ai','scripted'].indexOf(inputBranch),...[b.field844,b.field710,b.field714,b.field614,b.fieldc68].map(v=>v>>>0),floatBits(b.field6f8),floatBits(b.fieldb6c),b.fieldb04>>>0,b.fieldb08>>>0,...['6ec','6e8','6f4','6f0'].map(k=>floatBits(b[`field${k}`])),floatBits(c.frameEntry.analog),floatBits(c.frameEntry.rawDelta),...before];
  if(observe)observe(c,r);
 });
 return {...result,tail:[...result.tail,...words],inputBranch};
}
