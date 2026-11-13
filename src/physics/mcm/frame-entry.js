import {invalidateMcmTransform} from './event-orientation.js';
import {scheduleMcmFrameState} from './scheduler.js';

// Original 0x4a52c0..0x4a5566, before recovery/control handling. Vector
// constructors do not initialize memory. Three control scratch words are zeroed.
export function beginMcmFrame(c,rawDelta){
 const b=c.bike;
 if(b.field568){
  for(const node of [c.bodyNode,c.proxy]){
   for(let i=0;i<3;i++)node.local[12+i]=b.position[i];
   invalidateMcmTransform(node);
  }
 }
 const result=scheduleMcmFrameState(rawDelta,b.field8c8,b.field8cc,b.field8d4|0);
 b.field8c8=result.remainder;
 c.frameEntry={...result,inverseDt:Math.fround(result.inverseDt),control1c:0,control30:0,control2c:0,rawDelta};
 return c.frameEntry;
}
