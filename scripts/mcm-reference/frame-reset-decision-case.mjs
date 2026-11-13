import {decideMcmFrameReset} from '../../src/physics/mcm/frame-reset-decision.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
export function evaluateFrameResetDecision(w){
 const v=w.map(bitsFloat),node={local:[1,0,0,0,0,1,0,0,0,0,1,0,7,8,9,1],cacheValid:0};
 const c={bike:{field88c:w[0],fieldbd8:v[4],field844:w[5],field8b0:w[6],field884:w[7],field87c:v[8],field894:v[9],field564:v[10],field590:v[11],field594:v[12],position:v.slice(13,16),spawnPosition:v.slice(16,19),fieldc40:w[24]},rider:{field154:w[22]|0,active16c:w[23],fieldf8:v[25],field138:w[26],flag13c:w[27],field140:w[28],field144:w[29]},bodyNode:node,resetDecision:{setting:w[1],mode:w[2]|0,worldScale:v[3],controllerPresent:w[19],queryReset:()=>w[20]}};
 const r=decideMcmFrameReset(c,v[21]),b=c.bike,a=c.rider;
 return {branch:r.branch,words:[r.code,b.field844,b.field8b0,b.field884,b.fieldc40,...Array.from(b.position,floatBits),a.field154>>>0,floatBits(a.fieldf8),a.field138,a.flag13c,a.field140,a.field144,a.active16c,...node.local.slice(12,15).map(floatBits),r.queries,r.cleanupCalls].map(v=>v>>>0)};
}
