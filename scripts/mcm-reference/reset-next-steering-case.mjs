import {evaluateResetNextInput} from './reset-next-input-case.mjs';
import {prepareMcmFrameSteering} from '../../src/physics/mcm/frame-steering.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetNextSteering(input){
 let words;
 const result=evaluateResetNextInput(input,(c,route)=>{
  const b=c.bike,e=c.frameEntry,r=prepareMcmFrameSteering(c,route.branch);
  words=r?[1,route.branch==='player'?1:0,b.field724>>>0,floatBits(c.riderComponentLimit),floatBits(c.componentAngle),floatBits(b.field564),floatBits(b.field5ec),floatBits(b.field6f4),floatBits(r.limit),floatBits(e.control28),e.iterations>>>0,floatBits(e.dt),floatBits(b.field8c8),floatBits(e.rawDelta),floatBits(r.burst),floatBits(r.before),floatBits(b.field700),floatBits(b.field848),floatBits(b.field73c),floatBits(r.derivative)]:Array(20).fill(0);
 });
 return {...result,tail:[...result.tail,...words]};
}
