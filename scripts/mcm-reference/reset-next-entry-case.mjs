import {evaluateResetFrameReturn} from './reset-frame-return-case.mjs';
import {beginMcmFrame} from '../../src/physics/mcm/frame-entry.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
export function evaluateResetNextEntry(input){
 let words,scheduler;
 const result=evaluateResetFrameReturn(input,c=>{
  const b=c.bike,before=floatBits(b.field8c8),delta=bitsFloat(input.nextFrame.deltaBits);
  const r=beginMcmFrame(c,delta);scheduler=r;
  words=[r.iterations>>>0,floatBits(r.dt),floatBits(r.inverseDt),floatBits(r.storedInterval),floatBits(b.field8c8),b.field568>>>0,before,floatBits(delta),floatBits(b.field8cc),b.field8d4>>>0,r.control1c,r.control30,r.control2c,...Array.from(b.position,floatBits),...Array.from(b.savedPosition,floatBits)];
  for(const n of c.bounds.components)words.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
 });
 return {...result,tail:[...result.tail,...words],scheduler};
}
