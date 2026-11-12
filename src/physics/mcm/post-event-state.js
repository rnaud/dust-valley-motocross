import {floatBits} from './math.js';
import {resolveMcmWorldMatrix} from './world-transform.js';

// Original common post-event section 0x4ac6cd..0x4ac7c4. The delayed award
// includes 0x4b1a40 with optional UI observers absent; their callbacks are separate.
export function updateMcmPostEventState(c){
 const f=Math.fround,angularVelocity=[...c.angularVelocity];
 if((floatBits(c.speed)|0)<0x3f800000&&c.both)angularVelocity[1]=0;
 const m=resolveMcmWorldMatrix(c.node),[x,y,z]=angularVelocity;
 const worldAngularVelocity=[f((m[0]*x+m[8]*z)+m[4]*y),f(m[9]*z+(m[5]*y+m[1]*x)),f((m[10]*z+m[6]*y)+m[2]*x)];
 let field714=c.field714,field870=c.field870,timer=c.timer,score=c.score;
 if(field714&&!c.fieldbfc&&field870){
  if(floatBits(timer)>0x80000000){
   const raw=c.awardBase*2500,award=c.suppressAward?0:f(raw-raw%100);
   score=f(score+award);field870=0;field714=0;timer=0;
  }else timer=f(timer-c.dt);
 }
 return {position:c.node.local.slice(12,15),angularVelocity,worldAngularVelocity,field714,field870,timer,score,frontHeight:c.frontHeight,rearHeight:c.rearHeight,lastDt:c.dt};
}
