import {floatBits} from './math.js';
const f=Math.fround;
const nearestEven=x=>{
 const lo=Math.floor(x),part=x-lo;
 return part<.5?lo:part>.5?lo+1:lo%2===0?lo:lo+1;
};
const clamp=x=>floatBits(x)>0x80000000?0:(floatBits(x)|0)>0x3f800000?1:x;
const findFrame=(record,index)=>{
 let frame=record.firstFrame;
 while(frame&&frame.index!==index)frame=frame.next;
 if(!frame)throw new RangeError('Animation frame missing');
 return frame;
};
// Original 0x431100. Both products and the complement remain binary64 until
// the final binary32 store, unlike the frame interpolation in 0x430b70.
export function blendMcmAnimationChildren(a,b,weight){
 weight=clamp(weight);const inverse=1-weight;
 const axis=key=>a[key].map((v,k)=>f(v*inverse+b[key][k]*weight));
 return {componentIndex:a.componentIndex,local:a.local,forward:axis('forward'),up:axis('up'),position:axis('position')};
}
const interpolate=(a,b,weight)=>{
 weight=clamp(weight);const inverse=f(1-weight);
 const axis=key=>a[key].map((v,k)=>f(f(v*inverse)+f(b[key][k]*weight)));
 return {componentIndex:a.componentIndex,local:a.local,forward:axis('forward'),up:axis('up'),position:axis('position')};
};

// Original 0x430b70. Both records use the FIRST record's frame count to select
// adjacent frames. The retained record/frame and live bounds come from the
// second record's following frame, including wraparound at its end.
export function blendMcmAnimationPoses(object,first,second,fraction,blend,applyChild){
 const product=((first.frameCount-1)|0)*fraction;
 const index=nearestEven(f(product-.5)),weight=f(f(product)-index);
 const a=findFrame(first,index),b=findFrame(second,index);
 const an=a.next||first.firstFrame,bn=b.next||second.firstFrame;
 object.record=second;object.frame=bn;
 object.boundsMin=[...bn.boundsMin];object.boundsMax=[...bn.boundsMax];
 let ac=a.firstChild,bc=b.firstChild,anc=an.firstChild,bnc=bn.firstChild;
 const mix=f(1-blend);
 while(ac&&bc&&anc&&bnc){
  if(ac.componentIndex!==bc.componentIndex)throw new Error('Mismatched animation blend components');
  applyChild(blendMcmAnimationChildren(interpolate(ac,anc,weight),interpolate(bc,bnc,weight),mix));
  ac=ac.next;bc=bc.next;anc=anc.next;bnc=bnc.next;
 }
}

// Original 0x431250. Each pair shares its leading record's frame count. The
// second pair's fraction subtracts the FIRST pair's selected index, preserving
// the original behavior when the two pairs have different lengths.
export function blendMcmFourAnimationPoses(object,records,fraction,blend,secondaryBlend,applyChild){
 const products=[(records[0].frameCount-1)*fraction,(records[2].frameCount-1)*fraction];
 const indices=products.map(p=>nearestEven(f(p-.5)));
 const weights=products.map(p=>f(f(p)-indices[0]));
 const frames=records.map((record,i)=>findFrame(record,indices[i>>1]));
 const next=frames.map((frame,i)=>frame.next||records[i].firstFrame);
 object.record=records[3];object.frame=next[3];
 object.boundsMin=[...next[3].boundsMin];object.boundsMax=[...next[3].boundsMax];
 let current=frames.map(frame=>frame.firstChild),following=next.map(frame=>frame.firstChild);
 const mix=f(1-blend),secondary=f(1-secondaryBlend);
 while(current.every(Boolean)&&following.every(Boolean)){
  const samples=current.map((child,i)=>interpolate(child,following[i],weights[i>>1]));
  const first=interpolate(samples[0],samples[1],mix);
  const second=blendMcmAnimationChildren(samples[2],samples[3],mix);
  applyChild(blendMcmAnimationChildren(first,second,secondary));
  current=current.map(child=>child.next);following=following.map(child=>child.next);
 }
}
