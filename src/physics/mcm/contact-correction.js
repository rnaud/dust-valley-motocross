import {floatBits} from './math.js';
import {rotateMcmTransformAtPivot} from './transform.js';

// 0x4aaa55–0x4aaded: field/flag names retain unresolved caller semantics.
export function applyMcmContactCorrection(c) {
  const f=Math.fround, signed=x=>floatBits(x)|0;
  let matrix=[...c.matrix], field6ac=c.field6ac, mask=c.mask;
  const acceleration=c.state?c.torque.map((v,i)=>f(c.inertia[i+3]*v)):[f(c.inertia[0]*c.torque[0]),0,0];
  if(c.state && c.contact) {
    if(Math.abs(c.field4d8)<=f(.035) && signed(c.field560)<0x40000000) {
      const sign=floatBits(c.component44)>0x80000000?-1:1;
      if(c.controller170===2 && c.controller140) field6ac=f(sign*f(-.01));
      else {let angle=sign*f(-.03);if(signed(c.field894)<0x3f7ae148)angle*=f(1.000418782234192);field6ac=f(angle);}
    }
    if(Math.abs(field6ac)>=f(.001))matrix=rotateMcmTransformAtPivot(matrix,c.pivot,[0,0,1],field6ac);
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
          const candidate=f(((Math.asin(-(value/c.field5d8))*c.dt)*2)/c.field4f4);
          const limit=c.dt*f(.21);
          angle=f((limit<candidate?f(limit):candidate)*.5);
        } else {
          const limit=f(c.dt*4),candidate=(Math.asin(-(value/c.field5d8))/c.field4f4)*limit;
          angle=f((candidate<=limit?f(candidate):limit)*-.5);
        }
        matrix=rotateMcmTransformAtPivot(matrix,c.pivot,[1,0,0],angle);
      }
    }
  }
  return {matrix,acceleration,field6ac,mask};
}
