import {floatBits} from './math.js';
import {selectMcmDirectionalTrick} from './trick-selection.js';
import {updateMcmRiderPose} from './rider-pose.js';
import {updateMcmRiderBlend} from './rider-blend.js';
const f=Math.fround;
const nearestEven=x=>{const lo=Math.floor(x),part=x-lo;return part<.5?lo:part>.5?lo+1:lo%2===0?lo:lo+1;};

// Original 0x4aecb0 rider control flow and pose/blend update. The adapter supplies
// input queries and the recovered graph/animation transitions; callbacks mutate r.
export function updateMcmRider(c,callbacks){
 const r={...c,envelope:[...c.envelope]};
 if(r.state||r.field710||(r.fieldbfc!==0&&r.fieldbfc<3))return r;
 if(!r.ai&&!r.secondaryControl&&r.field4bc&&floatBits(r.height0)>0xc0200000&&floatBits(r.height1)>0xc0200000){
  const button9=callbacks.query(9);
  if(button9&&r.enabled){callbacks.nearby(r);return r;}
  const button6=callbacks.query(6),button7=callbacks.query(7);
  if(button6||button7){
   if(r.flags&0x10)r.fieldb4c=button6?1:2;
   else{
    const index=selectMcmDirectionalTrick({directionX:r.directionX,directionY:r.directionY,button6});
    if(index!==null){callbacks.trick(r,index);return r;}
   }
  }
 }
 if(r.field4bc&&(floatBits(r.height)|0)>0x40000000&&floatBits(r.height1)>0xbf800000){
  const raw=(.75-r.steer)*f(3.99),index=nearestEven(f(raw-.5));
  r.pose=(index+11)|0;r.weight=f(f(raw)-index);r.enabled=1;
  return {...r,...updateMcmRiderBlend(r)};
 }
 if(r.enabled){callbacks.resetOrientation(r);r.enabled=0;}
 return {...r,...updateMcmRiderPose(r)};
}
