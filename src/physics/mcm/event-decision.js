import {floatBits} from './math.js';

// Original 0x4a4d70. Input-query result and two CRT random values are supplied
// at the external-call boundary; the caller's event setup (0x4a4b60) is separate.
export function decideMcmBikeEvent(c){
 const f=Math.fround,signed=x=>floatBits(x)|0;
 const r={triggered:0,eventKind:c.eventKind,reason:c.reason,otherPresent:c.otherPresent,field710:c.field710,field714:c.field714,velocity:[...c.velocity],angularVelocity:[...c.angularVelocity],randomCalls:0,inputCalls:0};
 const event=(kind,reason)=>Object.assign(r,{triggered:1,eventKind:kind,reason});
 const side=()=>signed(r.angularVelocity[2])>0?4:5;
 if(c.launch){
  r.velocity=c.target.map((v,i)=>f((v-c.position[i])*f(.055)));r.velocity[1]=120;
  r.angularVelocity=[f(c.rand1/32768),f(c.rand0/32768),f(.02)];r.randomCalls=2;
  return event(3,12);
 }
 if(!c.field710&&c.inputPresent){
  r.inputCalls=1;
  if(c.inputResult&&c.field4bc&&!c.state&&floatBits(c.height0)>0xc0600000&&floatBits(c.height1)>0xc0600000)return event(2,1);
 }
 if(c.suppress){r.otherPresent=0;return r;}
 if(!c.field4bc&&c.field710){
  if(c.animation===11&&c.frame>27){r.field710=0;r.field714=1;}
  else return event(c.arg1?(signed(c.speed)>0x41f00000?1:side()):3,9);
 }
 if(c.counter>30)return event(c.arg1?1:3,8);
 if(c.field4bc||!c.field820){
  if(Math.abs(c.field4bc?c.angle4d8:c.angle4f0)>(c.field4bc?f(1.3):f(.9599)))return event(side(),5);
  if(c.arg1&&!c.arg2&&(c.terrainMode===1?f(.766):f(.342))>c.arg7&&signed(r.angularVelocity[0])>0)return event(1,7);
 }
 const up=(c.up[0]*0+c.up[1])+c.up[2]*0;
 // x87 C0 tests below also take the branch on unordered comparisons.
 if(!(up>=c.uprightThreshold))return event(3,6);
 if(c.otherPresent){
  const a=1/c.speed,b=1/c.otherSpeed,v=c.velocity,w=c.otherVelocity;
  const dot=((w[0]*b)*(v[0]*a)+(w[1]*b)*(v[1]*a))+(w[2]*b)*(v[2]*a);
  // Zero-speed normalization produces the x87 negative indefinite NaN.
  // Its stored unsigned bits (0xffc00000) select kind 3; JS NaN sign
  // is engine-dependent and must not control this branch.
  return event(dot>f(.707)?1:Number.isNaN(dot)||floatBits(f(dot))>0xbf34fdf4?3:side(),2);
 }
 if(c.time>c.arg8)return r;
 if(!(c.speed-c.previousSpeed>=c.decel*c.arg8))return event(1,4);
 if(c.arg9&&c.speed>c.previousSpeed&&!(c.accel*c.arg8>=c.invMass*c.arg11))return event(side(),10);
 return r;
}
