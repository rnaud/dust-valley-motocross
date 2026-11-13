import {mcmAdd as add,mcmMultiply as mul,mcmSubtract as sub} from './x87-arithmetic.js';
import {floatBits} from './math.js';
import {resolveMcmWorldMatrix} from './world-transform.js';

// Original common post-event section 0x4ac6cd..0x4ac7c4. The delayed award
// includes 0x4b1a40 with optional UI observers absent; their callbacks are separate.
export function updateMcmPostEventState(c){
 const f=Math.fround,angularVelocity=new Float64Array(c.angularVelocity);
 if((floatBits(c.speed)|0)<0x3f800000&&c.both)angularVelocity[1]=0;
 const m=resolveMcmWorldMatrix(c.node),[x,y,z]=angularVelocity;
 const worldAngularVelocity=new Float64Array(3);
 worldAngularVelocity[0]=f(add(add(mul(m[0],x),mul(m[8],z)),mul(m[4],y)));
 worldAngularVelocity[1]=f(add(mul(m[9],z),add(mul(m[5],y),mul(m[1],x))));
 worldAngularVelocity[2]=f(add(add(mul(m[10],z),mul(m[6],y)),mul(m[2],x)));
 let awardCalled=false;
 let field714=c.field714,field870=c.field870,timer=c.timer,score=c.score;
 if(field714&&!c.fieldbfc&&field870){
  if(floatBits(timer)>0x80000000){
   awardCalled=true;
   const raw=c.awardBase*2500,award=c.suppressAward?0:f(raw-raw%100);
   score=f(add(score,award));field870=0;field714=0;timer=0;
  }else timer=f(sub(timer,c.dt));
 }
 return {position:c.node.local.slice(12,15),angularVelocity,worldAngularVelocity,field714,field870,timer,score,frontHeight:c.frontHeight,rearHeight:c.rearHeight,lastDt:c.dt,awardCalled};
}
