import {floatBits} from './math.js';
import {seekMcmAnimation} from './animation-seek.js';
const f=Math.fround;
const leanScale=.36963000893592834,leanLimit=.699999988079071;
const progressScale=.7099999785423279,angleScale=.18369999527931213;
const hold=f(.24),angleLimit=f(2.7);

function targetAngle(b,target){
 let angle=f(Math.atan2(target.position[0]-b.position[0],target.position[2]-b.position[2])-b.heading);
 if(angle < -Math.PI)angle=f(angle+f(2*Math.PI));
 else if(angle > Math.PI)angle=f(angle-f(2*Math.PI));
 return angle;
}

// Original 0x4af8fe..0x4afd45: field710 != 0, signed animation byte < 0.
// Controls map to +824 active, +828 returning, +82c lean, +830 progress,
// +834 angle. Both seeks execute even on the call that clears field710.
export function updateMcmNearbyFrameRider(c,delta){
 const {bike:b}=c;
 let useProgress=true;
 const finish=()=>{b.active=0;b.progress=hold;useProgress=false;};
 if(b.returning){
  const negative=floatBits(b.lean)>0x80000000;
  b.progress=f(negative?b.progress+delta:b.progress-delta);
  if(negative?(floatBits(b.progress)|0)>0:floatBits(b.progress)>0x80000000){
   b.field710=0;b.animation=0;b.returning=0;b.progress=0;
  }
 }else if(b.active){
  const positive=(floatBits(b.lean)|0)>0,negative=floatBits(b.lean)>0x80000000;
  if(!positive&&!negative)finish();
  else{
   b.progress=f(positive?b.progress+delta:b.progress-delta);
   if(positive?b.progress>b.lean:b.progress<b.lean)finish();
   else if(positive?b.lean-.10000000149011612<b.progress:b.lean+.10000000149011612>b.progress){
    const angle=targetAngle(b,c.target),lean=f(angle*leanScale*leanLimit);
    const retreating=positive?b.angle>angle:b.angle<angle;
    if(retreating&&(positive?b.progress>lean:b.progress<lean)){
     b.angle=f(b.progress*3.864686965942383);b.active=0;b.progress=hold;
    }else if(!retreating&&(positive?(floatBits(angle)|0)>0x402ccccd:floatBits(angle)>0xc02ccccd)){
     b.angle=positive?angleLimit:-angleLimit;b.lean=positive?leanLimit:-leanLimit;
    }else{b.angle=angle;b.lean=lean;}
   }
  }
 }else{
  b.progress=f(b.progress-delta);
  if(floatBits(b.progress)>0x80000000){
   b.returning=1;b.progress=f(b.angle*leanScale*leanLimit);b.lean=b.progress;
  }else useProgress=false;
 }
 const fraction=f((useProgress?b.progress*progressScale:b.angle*angleScale)+.5);
 seekMcmAnimation(c.riderAnimation,c.records[14],fraction,c.applyRider);
 seekMcmAnimation(c.bikeAnimation,c.records[20],fraction,c.applyBike);
 return fraction;
}
