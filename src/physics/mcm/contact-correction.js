import {mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
import {floatBits,bitsFloat} from './math.js';
import {rotateMcmTransformAtPivot} from './transform.js';

// Original CRT asin returns negative indefinite on a domain error.
const asin=x=>Number.isNaN(x)?x:Math.abs(x)>1?bitsFloat(0xffc00000):Math.asin(x);

// 0x4aaa55–0x4aaded: field/flag names retain unresolved caller semantics.
export function applyMcmContactCorrection(c) {
  const f=Math.fround, signed=x=>floatBits(x)|0;
  let matrix=[...c.matrix], field6ac=c.field6ac, mask=c.mask, rotationApplied=false;
  const acceleration=new Float64Array(3);
  if(c.state){for(let i=0;i<3;i++)acceleration[i]=f(mul(c.inertia[i+3],c.torque[i]));}
  else acceleration[0]=f(mul(c.inertia[0],c.torque[0]));
  // Negated ordered comparisons retain the original unordered x87 branches.
  if(c.state && c.contact) {
    if(!(Math.abs(c.field4d8)>f(.035)) && signed(c.field560)<0x40000000) {
      const sign=floatBits(c.component44)>0x80000000?-1:1;
      if(c.controller170===2 && c.controller140) field6ac=f(sign*f(-.01));
      else {let angle=sign*f(-.03);if(signed(c.field894)<0x3f7ae148)angle*=f(1.000418782234192);field6ac=f(angle);}
    }
    if(Math.abs(field6ac)>=f(.001)){matrix=rotateMcmTransformAtPivot(matrix,c.pivot,[0,0,1],field6ac);rotationApplied=true;}
  }
  if(c.contact && !c.state) {
    if(c.both)mask=1;
    else if(c.rear || c.front) {
      const rear=!!c.rear,value=rear?c.field590:c.field594,bits=floatBits(value);
      mask=rear?2:1;
      if(bits>0xc0a66666)mask=0;
      else if(signed(c.field6a4)<0x41a00000 && bits>0xb8d1b717 && bits<0xbf19999a) {
        let angle;
        if(rear) {
          const candidate=f(div(mul(mul(asin(-div(value,c.field5d8)),c.dt),2),c.field4f4));
          const limit=mul(c.dt,f(.21));
          angle=f(mul(!(limit>=candidate)?f(limit):candidate,.5));
        } else {
          const limit=f(mul(c.dt,4)),candidate=mul(div(asin(-div(value,c.field5d8)),c.field4f4),limit);
          angle=f(mul(!(candidate>limit)?f(candidate):limit,-.5));
        }
        matrix=rotateMcmTransformAtPivot(matrix,c.pivot,[1,0,0],angle);rotationApplied=true;
      }
    }
  }
  return {matrix,acceleration,field6ac,mask,rotationApplied};
}
