import {evaluateResetFrameRider} from './reset-frame-rider-case.mjs';
import {finishMcmFrame} from '../../src/physics/mcm/frame-return.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetFrameReturn(input,observe){
 let words;
 const result=evaluateResetFrameRider(input,c=>{
  c.frameReturn=input.frameReturn;
  const before=[...Array.from(c.bike.savedPosition,floatBits),...Array.from(c.bike.position,floatBits)];
  finishMcmFrame(c);
  words=[c.bike.field568,...Array.from(c.bike.savedPosition,floatBits)];
  for(const n of c.bounds.components)words.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  words.push(...before,1);
  if(observe)observe(c);
 });
 return {...result,tail:[...result.tail,...words]};
}
