import {floatBits} from './math.js';
import {integrateMcmLinear} from './integrate-linear.js';

// Original 0x4aaf02..0x4ab49e. Offset names retain unresolved steering semantics.
export function updateMcmForceLinear(c) {
  const f=Math.fround,signed=v=>floatBits(v)|0;
  const acceleration=c.totalForce.map(v=>f(c.inverseMass*v));
  const deltaVelocity=acceleration.map(v=>f(v*c.dt));
  let scratch540=[...c.scratch540],fallback=0;
  if(c.both && signed(c.field738)>0x40e00000 && signed(c.fieldcc)>=0x38d1b717 && signed(c.fieldc8)<0x3e800000){
    const a=c.axis584,b=c.direction4ec;
    scratch540=[f(a[1]*b[2]-b[1]*a[2]),f(b[0]*a[2]-b[2]*a[0]),f(b[1]*a[0]-b[0]*a[1])];
    const [x,y,z]=scratch540,length=f(Math.sqrt(f((x*x+y*y)+z*z)));
    if(signed(length)<0x3ef57742){
      const angle=f(Math.asin(length));
      if(Number.isFinite(angle)){
        fallback=f(f(Math.min(c.dt*f(.8),angle))*(floatBits(scratch540[1])>0x80000000?-1:1));
        if(Math.abs(fallback)<c.field90)fallback=0;
      }
    }
  }
  let field6d8=c.field6d8,field6dc=c.field6dc,field6e0=c.field6e0|0;
  if(c.both && signed(c.field44)<0x3f666666 && signed(c.field54)>0){
    const drive=f(((((c.field5dc*c.field68+c.field5dc)*c.inertiaY)*c.field54)*c.dt)*c.field68);
    const lean=Math.abs(c.field4f0);
    if(lean>f(.005)){
      const first=f(Math.min(drive*32,f(1.57))),second=f(Math.min(lean*5,1.5));
      field6d8=f((c.dt*first)*second*(floatBits(c.field4f0)>0x80000000?-1:1));
      field6dc=f((c.field8cc*f(-1.333))*field6d8);
      const n=f(.75/c.field8cc-.5),lo=Math.floor(n),fraction=n-lo;
      field6e0=(fraction<.5?lo:fraction>.5?lo+1:lo%2===0?lo:lo+1)|0;
    }else field6d8=0;
  }else if((c.both||c.contact) && (floatBits(field6d8)&0x7fffffff)!==0){
    const old=floatBits(field6d8);
    field6d8=f(field6dc+field6d8);field6e0=(field6e0-1)|0;
    if((old>0x80000000?signed(field6d8)>0:floatBits(field6d8)>0x80000000)||field6e0<0)field6d8=0;
  }else if(!c.both)field6d8=0;
  const rotation=(floatBits(field6d8)&0x7fffffff)!==0?field6d8:fallback;
  return {...integrateMcmLinear({...c,deltaVelocity}),acceleration,deltaVelocity,scratch540,field6d8,field6dc,field6e0,rotation};
}
