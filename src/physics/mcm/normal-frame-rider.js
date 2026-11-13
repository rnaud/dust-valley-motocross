import {floatBits,bitsFloat} from './math.js';
import {blendMcmAnimationPoses,blendMcmFourAnimationPoses} from './animation-pose-blend.js';
import {seekMcmAnimation} from './animation-seek.js';
import {synchronizeMcmProxyTransform} from './proxy-transform.js';
const f=Math.fround;
const scale=.22200000286102295,offset=.11100000143051147;
const lowScale=.3889999985694885,highScale=.7770000100135803;

// Original 0x4afdf2..0x4b00f9: normal frame-end pose application. The caller
// selects this path for state=0, field710=0 and fieldbfc != 2. Animation records
// are the live table at bike+0x740; callbacks mutate the two live object graphs.
export function updateMcmNormalFrameRider(c){
 const {bike:b,records,bikeAnimation,riderAnimation,applyBike,applyRider}=c;
 let pose=b.pose,next,other=b.nextPose,otherNext;
 if(b.enabled)next=Math.min(pose+1,13);
 else{
  if(pose>2){
   let speed=(floatBits(b.speed)|0)>=0x4200cccd?bitsFloat(0x4200cccd):b.speed;
   if(floatBits(speed)>=0xc200cccd)speed=bitsFloat(0xc200cccd);
   b.secondaryWeight=f((speed*.03105589933693409+1)*.5);
   next=pose+2;
   if(next>9){pose=7;next=9;}
   otherNext=Math.min(other+2,10);
  }else{next=pose+1;otherNext=Math.min(other+2,7);}
 }
 const inverseWeight=f(1-b.weight);
 if(b.enabled)blendMcmAnimationPoses(riderAnimation,records[pose],records[next],b.fraction,inverseWeight,applyRider);
 else blendMcmFourAnimationPoses(riderAnimation,[records[pose],records[next],records[other],records[otherNext]],b.fraction,inverseWeight,b.secondaryWeight,applyRider);
 if(pose>10&&pose<14){
  blendMcmAnimationPoses(bikeAnimation,records[pose+6],records[next+6],b.fraction,inverseWeight,applyBike);
 }else{
  let fraction=b.fraction;
  if(pose===9)fraction=f((fraction*scale-offset)+.5);
  else if(pose>6){
   if((floatBits(fraction)|0)<=0)fraction=pose===7?f(.5-(inverseWeight*lowScale+offset)):bitsFloat(0x3ec72b02);
   else if((floatBits(fraction)|0)>=0x3f800000)fraction=pose===7?f(((inverseWeight*highScale+scale)-(inverseWeight*lowScale+offset))+.5):bitsFloat(0x3f1c6a7f);
   else fraction=pose===7?f(((inverseWeight*highScale+scale)*fraction-(inverseWeight*lowScale+offset))+.5):f((fraction*scale-offset)+.5);
  }
  seekMcmAnimation(bikeAnimation,records[16],fraction,applyBike);
 }
 synchronizeMcmProxyTransform(c.bodyNode,c.riderBodyNode);
}
