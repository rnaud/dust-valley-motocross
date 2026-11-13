import {evaluateCollisionSyncSubstep} from './collision-sync-substep-case.mjs';
import {updateMcmCollisionDispatchSubstep} from '../../src/physics/mcm/collision-dispatch-substep.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateCollisionDispatchSubstep(input,step=updateMcmCollisionDispatchSubstep){
 let tail;
 const prefix=evaluateCollisionSyncSubstep(input,c=>{
  const s=c.collisionSync,d=c.collisionDispatch,o=s.object;
  const wall={type:3,enabled:1,start:d.start,end:d.end,contactCC:[0,0,0],contactD8:[0,0,0],contactE4:[0,0,0]};
  Object.assign(o,{enabled:d.enabled,radiusSquared:Math.fround(s.radius*s.radius),extents:[s.radius,s.radius,s.radius],contactCC:[0,0,0],contactD8:[0,0,0],contactE4:[0,0,0]});
  const m=d.manager={enabled:d.managerEnabled,objects:[o,wall],cells:s.grid.cells,pairs:Array.from({length:2},()=>[d.pair,d.pair]),depth:0,contactCC:[1000,1001,1002],contactD8:[1003,1004,1005],contactE4:[1006,1007,1008],otherE4:[1009,1010,1011]};
  const r=step(c);
  tail=[d.skip,d.callbackCount,...m.pairs.flat(),...Array.from([m.depth],floatBits),...[m.contactCC,m.contactD8,m.contactE4,m.otherE4,o.contactCC,o.contactD8,o.contactE4,wall.contactCC,wall.contactD8,wall.contactE4].flatMap(v=>Array.from(v,floatBits)),+(wall.other===o),+(m.currentA===0),+(m.currentB===1),d.priorState];
  return r;
 });
 return [...prefix,...tail];
}
