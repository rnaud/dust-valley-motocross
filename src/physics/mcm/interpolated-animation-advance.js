import {floatBits} from './math.js';
const f=Math.fround;
const nearestEven=x=>{const lo=Math.floor(x),part=x-lo;return part<.5?lo:part>.5?lo+1:lo%2===0?lo:lo+1;};
const clamp=x=>floatBits(x)>0x80000000?0:(floatBits(x)|0)>0x3f800000?1:x;
const interpolate=(a,b,w,roundAll=false)=>{
 w=clamp(w);const inverse=f(1-w),axis=k=>a[k].map((v,j)=>f((!roundAll&&k==='forward'&&j===2?v*inverse:f(v*inverse))+f(b[k][j]*w)));
 return {componentIndex:a.componentIndex,local:a.local,forward:axis('forward'),up:axis('up'),position:axis('position')};
};
// Original rider proxy vtable update 0x45bcd0 (normal and crossfade paths).
// This interpolates adjacent frames; 0x42e890 is a different virtual update.
export function advanceMcmInterpolatedAnimation(a,delta,applyChild){
 if(a.stopped)return 0;
 const record=a.record,elapsed=f(a.remainder+delta);
 a.blendTime=f(a.blendTime+delta);
 const steps=nearestEven(f(record.fps*elapsed-.5)),result=(a.frame.index+steps)|0,stopped=!record.loop&&result>=record.frameCount-1;
 a.remainder=f(elapsed-steps/record.fps);const weight=f(record.fps*a.remainder);
 for(let i=0;i<steps;i++){
  if(a.frame.next||record.loop){a.displayedFrame=a.frame;a.frame=a.frame.next||record.firstFrame;}
  else a.remainder=f(1/record.fps+a.remainder);
 }
 const next=a.frame.next||(record.loop?record.firstFrame:null);
 a.boundsMin=[...a.frame.boundsMin];a.boundsMax=[...a.frame.boundsMax];
 if(a.blending&&!next)a.blending=0;
 if(a.blending){
  const blend=f(1-a.blendTime/a.blendDuration);
  let current=a.frame.firstChild,following=next.firstChild,previous=a.previousFrame.firstChild,retained=a.blendFrame.firstChild;
  for(;current&&retained;current=current.next,following=following?.next,previous=previous?.next,retained=retained.next){
   if(!following||!previous)throw Error('Missing crossfade animation child');
   applyChild(interpolate(interpolate(current,following,weight,true),previous,blend,true));
  }
  if(a.blendDuration<=a.blendTime)a.blending=0;
 }else {
 a.previousFrame=a.displayedFrame;a.blendFrame=a.frame;
 if(next){
  let current=a.frame.firstChild,following=next.firstChild;
  for(;current;current=current.next,following=following?.next){if(!following)throw Error('Missing following animation child');applyChild(interpolate(current,following,weight));}
 }else{
  let previous=a.displayedFrame.firstChild,current=a.frame.firstChild;
  for(;previous;previous=previous.next,current=current?.next){if(!current)throw Error('Missing final animation child');applyChild(current);}
 }
 }
 if(stopped){a.stopped=1;a.record=null;return 0;}
 return result;
}
