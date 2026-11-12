import {floatBits} from './math.js';
import {updateMcmRiderBlend} from './rider-blend.js';
const f=Math.fround;
function nearestEven(x){const lo=Math.floor(x),part=x-lo;return part<.5?lo:part>.5?lo+1:lo%2===0?lo:lo+1;}

// Original 0x4aefcd..0x4af185, followed by the recovered blend tail.
// Earlier input/trick handling and orientation-reset branches are separate.
export function updateMcmRiderPose(c){
 let pose=c.pose,weight=c.weight,nextPose=c.nextPose,secondaryWeight=c.secondaryWeight;
 if(!c.field4bc&&c.upperHeight<c.height){pose=7;weight=1;nextPose=8;}
 else if(!c.field4bc&&c.lowerHeight<c.height){pose=7;weight=f((c.height-c.lowerHeight)/(c.upperHeight-c.lowerHeight));nextPose=8;}
 else if((floatBits(c.poseSpeed)|0)>0x41600000){
  const raw=(.75-c.steer)*f(5.99),index=nearestEven(f(raw-.5));
  weight=index===2&&(floatBits(c.poseSpeed)|0)<=0x42000000?f((c.poseSpeed-14)*f(.0555)):f(f(raw)-index);
  nextPose=(4+index*2)|0;pose=(nextPose-1)|0;
 }else{
  const raw=(.75-c.steer)*f(3.99),index=nearestEven(f(raw-.5));
  pose=index;weight=f(f(raw)-index);secondaryWeight=f((14-c.poseSpeed)*f(1/14));nextPose=(2*index+3)|0;
 }
 return {...updateMcmRiderBlend(c),pose,weight,nextPose,secondaryWeight};
}
