import {mcmSqrtLookup as sqrt,floatBits as bits,bitsFloat as float} from './math.js';
// Original 0x46f0a4..0x46f41a. Words use the oracle layout documented below;
// node IDs replace pointers. The caller owns the shared per-thread random stream.
// Input: reserved, mode, class3456, raceActive, handicap bits, flightTime bits,
// nearest node ID, 25 body words in AI_JUMP_OFFSETS order, two node word9 values.
// Output: vy, b44,b64,b68,b40,b18,b20,b4c,b38, two node flags,
// flightTime bits, resulting RNG state and cumulative draw count.
export const AI_JUMP_OFFSETS=Object.freeze([0x4bc,0xb44,0xb64,0xb68,0xb40,0xb18,0xb20,0xb4c,0xb38,0x4f8,0x4fc,0x500,0x510,0x514,0x518,0xb80,0xb84,0xb88,0xbf8,0xbac,0x73c,0x848,0xb6c,0x8b4,0x590]);
const f=Math.fround,g1=f(.03105589933693409),g2=f(.06211179867386818),tenth=f(.1),less=(a,b)=>a<b||Number.isNaN(a)||Number.isNaN(b);
export function computeMcmAiJumpState(w,random){const b=Uint32Array.from(w.slice(7,32)),v=i=>float(b[i]),put=(i,x)=>b[i]=bits(f(x)),draw=()=>random.draw()/32768,nodes=[w[32],w[33]];let flight=float(w[5]);
 if(!b[0])b[1]=0;
 else if(!b[1]){
  b[1]=1;b[2]=0;b[3]=0x3ff1463a;b[4]=w[6];b[5]=b[9];b[6]=b[11];const difficulty=b[18]|0,r=draw();if(less(difficulty,r*((difficulty+1)|0))||(!w[1]&&draw()>.25))b[7]=1;
  if(w[2]){
   put(8,sqrt(f((v(9)-v(15))**2+(v(11)-v(17))**2)));let time=v(8)/sqrt(f(v(14)*v(14)+v(12)*v(12)));if((w[4]|0)>0){time=f(time);if(b[19]&&w[3])time=draw()*float(w[4])*f(10)+time;}time=f(time);
   let target=(bits(time)|0)>0?f(time*f(16.1)-(v(10)-v(16))/time):v(13);
   if(less(v(13),target)&&(b[20]|0)>=0x41f00000&&(b[21]|0)>=0x41c80000){const cap=v(13)*f(1.2);if(less(cap,target))target=f(cap);put(13,target);}
   else if(v(13)>target){const cap=v(13)*f(.9);if(cap>target)target=f(cap);put(13,target);}
  }
 }
 if((b[22]&255)&&b[23]===9&&b[4])nodes[b[4]-1]=0;
 if(b[0]){
  const raw=v(13)*g1,t=f(raw),squared=f(raw*raw);flight=less((v(10)-v(16))*(-g2),squared)?f(sqrt(f(-v(24)*g2+squared))+t-f(.5)):0;
  if(b[19]&&w[3])flight=f((float(w[4])*tenth+1)*flight);
  if(!w[1])flight=f((draw()*f(.2)-tenth+1)*flight);
 }
 return [b[13],b[1],b[2],b[3],b[4],b[5],b[6],b[7],b[8],...nodes,bits(flight),random.state,random.calls];
}
