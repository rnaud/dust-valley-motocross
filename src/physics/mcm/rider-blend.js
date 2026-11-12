import {floatBits} from './math.js';

// Original rider-update tail 0x4af185..0x4af6f6. Selection and trick handling
// precede this section. Preserve the extended value after the envelope store.
export function updateMcmRiderBlend(c){
 const f=Math.fround,signed=x=>floatBits(x)|0;
 let blend=c.blend,positivePeak=c.positivePeak,negativePeak=c.negativePeak,envelope=[...c.envelope];
 const result=()=>({blend,positivePeak,negativePeak,envelope});
 if(!c.enabled){
  envelope=[0,f(c.nominalDt*21),1,-1];
  if(signed(c.limit)<0x3f490fdb){
   const raw=(c.axis/c.limit+1)*.5,value=raw>0?f(raw):0;
   blend=signed(value)>=0x3f800000?1:value;
  }else if(Math.abs(c.axis)>f(Math.PI/4))blend=floatBits(c.axis)>0x80000000?0:1;
  else blend=f((c.axis+f(Math.PI/4))*f(.6366198062896729));
  return result();
 }
 if(floatBits(c.control)<=0x80000000){
  if(signed(blend)<=0x3f000000){
   negativePeak=0;
   if(c.control>=positivePeak)positivePeak=c.control;
   else if(!(envelope[0]<c.control))return result();
  }
 }else{
  positivePeak=0;
  if(signed(blend)>=0x3f000000){
   if(negativePeak>=c.control)negativePeak=c.control;
   else if(!(envelope[0]>c.control))return result();
  }
 }
 const rawDifference=c.control-envelope[0],difference=f(rawDifference);
 const limited=rawDifference<0?Math.max(envelope[3],difference):Math.min(envelope[2],difference);
 const raw=((Math.min(envelope[1],c.dt)/envelope[1])*limited)+envelope[0];
 envelope[0]=f(raw);blend=f(.5-raw*.5);
 return result();
}
