import {floatBits,mcmSqrtLookup} from './math.js';
import {mcmMultiply as mul,mcmSubtract as sub,mcmDivide as div,mcmAdd as add} from './x87-arithmetic.js';
const f=Math.fround,signed=v=>floatBits(v)|0;
// Original 0x4a57c0..0x4a5993. AI/scripted calls must finish before this block.
export function prepareMcmFrameSteering(c,inputBranch){
 if(inputBranch==='ai'||inputBranch==='scripted')return null;
 const b=c.bike,e=c.frameEntry;
 let limit=0;
 if(inputBranch==='player'){
  limit=c.riderComponentLimit;
  if(b.field724!==9){
   const square=f(mul(div(b.field564,b.field5ec),mul(limit,limit)));
   const reduced=f(sub(limit,mcmSqrtLookup(square)));
   limit=reduced>=0?reduced:0;
  }
  e.control28=f(sub(-mul(b.field6f4,limit),c.componentAngle));
  if(!(Math.abs(e.control28)>=f(.001)))e.control28=0;
  else{
   let duration=mul(e.iterations,e.dt);
   if(signed(b.field8c8)>0x38d1b717)duration=add(duration,b.field8c8);
   e.control28=f(div(e.control28,duration));
  }
 }
 const before=b.field700;
 let derivative=0,burst=0;
 if(signed(b.field848)>0x41c80000&&(floatBits(e.rawDelta)&0x7fffffff)!==0&&signed(b.field73c)>0x41f00000){
  derivative=f(div(sub(b.field6ec,b.field700),e.rawDelta));
  if(signed(b.field6ec)>0x3ecccccd&&signed(derivative)>0x41300000){
   const speed=f(mul(b.field848,f(.6)));
   const bounded=100<=speed||Number.isNaN(speed)?100:speed;
   const demand=f(mul(mul(bounded,derivative),5));
   burst=10000<=demand||Number.isNaN(demand)?10000:demand;
  }
 }
 b.field700=b.field6ec;
 // Stack +0x190 supplies the rear suspension extra stiffness in the substep.
 e.extraStiffness=burst;
 return {limit,before,derivative,burst};
}
