import {floatBits,mcmSqrt} from './math.js';
import {startMcmTrick} from './trick-start.js';

// Original 0x4aee32..0x4aef82. Only the active directional-trick branch;
// preceding button/input gates are handled by the caller.
export function selectMcmDirectionalTrick({directionX:x,directionY:y,button6}){
 const f=Math.fround,rawSquare=x*x+y*y;
 if(!(rawSquare>.25))return null;
 const rawThreshold=mcmSqrt(f(rawSquare))*f(.5205699801445007),threshold=f(rawThreshold),negative=f(-threshold);
 let index;
 if(rawThreshold<y)index=x>threshold?3:negative>x?0:4;
 else if(negative>y)index=x>threshold?2:x<negative?1:6;
 else index=(floatBits(x)|0)>0?7:5;
 return index+(button6?0:8);
}
export function startMcmDirectionalTrick(c){
 const trickIndex=selectMcmDirectionalTrick(c);
 return trickIndex===null?null:startMcmTrick({...c,trickIndex});
}
