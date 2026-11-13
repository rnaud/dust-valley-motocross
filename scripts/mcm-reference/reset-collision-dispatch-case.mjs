import {evaluateResetCollisionSync} from './reset-collision-sync-case.mjs';
import {updateMcmResetCollisionDispatch} from '../../src/physics/mcm/reset-collision-dispatch.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function evaluateResetCollisionDispatch(input,step=updateMcmResetCollisionDispatch){
 let d,o,w;
 const words=evaluateResetCollisionSync(input,c=>{
  d=c.dispatch=structuredClone(input.dispatch);o=c.collision;
  // Keep a supplied object even when the bike has no collision pointer.
  if(!o)o=c.collisionState;
  Object.assign(o,{owner:0,enabled:d.objectEnabled,radiusSquared:Math.fround(o.radius*o.radius),extents:[o.radius,o.radius,o.radius],contactCC:[0,0,0],contactD8:[0,0,0],contactE4:[0,0,0]});
  w={token:1,owner:1,enabled:1,type:3,start:d.start,end:d.end,contactCC:[0,0,0],contactD8:[0,0,0],contactE4:[0,0,0]};
  d.manager={objects:[o,w],cells:c.grid.cells,enabled:d.enabled,pairs:Array.from({length:2},()=>[d.pairState,d.pairState]),depth:0,contactCC:[1000,1001,1002],contactD8:[1003,1004,1005],contactE4:[1006,1007,1008],otherE4:[1009,1010,1011],currentA:null,currentB:null};
  return step(c);
 });
 const m=d.manager;
 return [...words,d.callbackCount,d.priorState,...m.pairs.flat(),...Array.from([m.depth],floatBits),...Array.from(m.contactCC,floatBits),...Array.from(m.contactD8,floatBits),...Array.from(m.contactE4,floatBits),...Array.from(m.otherE4,floatBits),...Array.from(o.contactCC,floatBits),...Array.from(o.contactD8,floatBits),...Array.from(o.contactE4,floatBits),...Array.from(w.contactCC,floatBits),...Array.from(w.contactD8,floatBits),...Array.from(w.contactE4,floatBits),+(w.other===o),+(m.currentA===0),+(m.currentB===1),d.priorKind,floatBits(d.priorAngularX)];
}
