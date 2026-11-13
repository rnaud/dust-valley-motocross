import {floatBits} from './math.js';
const f=Math.fround;
const nearestEven=x=>{
 const lo=Math.floor(x),part=x-lo;
 return part<.5?lo:part>.5?lo+1:lo%2===0?lo:lo+1;
};

// Original 0x42e890. Animation state persists across calls. applyChild dispatches
// the object's normal or mirrored vtable callback, including its graph mutations.
export function advanceMcmAnimation(object,delta,applyChild){
 if(object.stopped)return 0;
 const record=object.record,elapsed=f(object.remainder+delta);
 const steps=nearestEven(f(record.fps*elapsed-.5));
 object.remainder=f(elapsed-steps/record.fps);
 const result=(object.frame.index+steps)|0;
 if(!record.loop&&result>record.frameCount-1){
  object.stopped=1;object.record=null;object.remainder=0;return 0;
 }
 for(let i=0;i<steps;i++)object.frame=object.frame.next||record.firstFrame;
 object.previousFrame=object.displayedFrame;object.displayedFrame=object.frame;
 object.stopped=0;
 if(!object.blending){
  object.boundsMin=[...object.frame.boundsMin];object.boundsMax=[...object.frame.boundsMax];
  for(let child=object.frame.firstChild;child;child=child.next)applyChild(child);
 }else{
  object.blendTime=f(object.blendTime+elapsed);
  const ratio=f(object.blendTime/object.blendDuration);
  let weight=ratio;
  if(floatBits(ratio)>0x80000000)weight=0;
  else if((floatBits(ratio)|0)>0x3f800000)weight=1;
  const inverse=f(1-weight);
  let old=object.blendFrame.firstChild,current=object.frame.firstChild;
  while(old&&current){
   if(old.componentIndex!==current.componentIndex)throw new Error('Mismatched animation blend components');
   // The z product stays on the x87 stack; x/y products are stored before addition.
   const axis=(a,b)=>a.map((v,k)=>f((k===2?v*inverse:f(v*inverse))+f(b[k]*weight)));
   applyChild({componentIndex:old.componentIndex,local:old.local,
    forward:axis(old.forward,current.forward),up:axis(old.up,current.up),
    position:old.position.map((v,k)=>f(f(v*inverse)+f(current.position[k]*weight)))});
   old=old.next;current=current.next;
  }
  if(object.blendTime>=object.blendDuration)object.blending=0;
 }
 return result;
}
