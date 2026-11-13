import {invalidateMcmTransform} from './event-orientation.js';

// Original 0x4ad07f..0x4ad115. The selected-player gate restores both local
// translations from the previous position, then every path saves the current
// position. 0x4b7770 stores directly; it does not convert from world space.
export function finishMcmFrame(c){
 const b=c.bike,s=c.frameReturn;
 if(!s.disabled&&s.state===3&&s.playerIsBike){
  for(const node of [c.bodyNode,c.proxy]){
   for(let i=0;i<3;i++)node.local[12+i]=b.savedPosition[i];
   invalidateMcmTransform(node);
  }
  b.field568=1;
 }else b.field568=0;
 const position=new Float64Array(3);
 for(let i=0;i<3;i++)position[i]=b.position[i];
 b.savedPosition=position;
}
