import {updateMcmContactBalanceSubstep} from './contact-balance.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {transformMcmPoint,inverseTransformMcmPoint} from './position-transform.js';
import {updateMcmSuspensionResponse} from './suspension-response.js';
import {invalidateMcmTransform} from './event-orientation.js';
const f=Math.fround;

// Original 0x4a7221..0x4a73e2, with exits at the no-wheel and rear-only branches.
export function updateMcmFrontSuspension(c){
 c.localBalanceCenter=inverseTransformMcmPoint(resolveMcmWorldMatrix(c.bodyNode),c.balanceCenter);
 if(c.state844){
  c.localBalanceCenter[1]=f(c.localBalanceCenter[1]-1);
  c.balanceCenter=transformMcmPoint(resolveMcmWorldMatrix(c.bodyNode),c.localBalanceCenter);
 }
 if(!c.anyContact || !c.frontContact)return;
 const s=c.frontSuspension;
 const r=updateMcmSuspensionResponse({...s,dt:c.dt,height:c.heights[0],point:c.points[6],
  normal:c.points[4],direction:c.frontLever,anyContact:c.control2c,state:c.state844,
  translation:s.node.local.slice(12,15),cacheValid:s.node.cacheValid});
 c.heights[0]=r.height;c.points[6]=r.point;
 for(const key of ['displacement','velocity','compression','travel','previousDisplacement','previousTravel','limited','contactLimited','active'])s[key]=r[key];
 if(r.active){s.node.local.splice(12,3,...r.translation);invalidateMcmTransform(s.node);}
}
export function updateMcmFrontSuspensionSubstep(c){
 const result=updateMcmContactBalanceSubstep(c);updateMcmFrontSuspension(c);return result;
}
