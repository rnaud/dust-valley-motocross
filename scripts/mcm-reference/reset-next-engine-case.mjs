import {evaluateResetNextTerrain} from './reset-next-terrain-case.mjs';
import {prepareMcmFrameEngine} from '../../src/physics/mcm/frame-engine-entry.js';
import {substepStartWords} from './substep-start-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetNextEngine(input){
 let words=Array(52).fill(0),engineBranch='pending';
 const result=evaluateResetNextTerrain(input,(c,decision)=>{
  const e=c.frameEntry,p=c.contactPhase,r=prepareMcmFrameEngine(c);engineBranch=r?'executed':'no-iterations';
  words=[r?2:1,e.iterations>>>0,floatBits(e.dt),floatBits(e.inverseDt),floatBits(e.analog),e.control1c,e.control30,e.control2c,decision.code];
  if(r)words.push(...substepStartWords(c.engineEntry,r),...Array.from(p.totalTorque,floatBits),floatBits(p.traction.scratch[0]),floatBits(p.frontLoad.turnAngle),p.contactCorrection.mask,floatBits(p.frontTire.alignment),floatBits(p.traction.tire.alignment),floatBits(p.frontTire.perpendicular),floatBits(p.traction.tire.perpendicular));else words.push(...Array(43).fill(0));
 });
 return {...result,tail:[...result.tail,...words],engineBranch};
}
