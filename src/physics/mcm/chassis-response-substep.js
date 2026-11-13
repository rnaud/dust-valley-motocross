import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {updateMcmChassisContactSubstep} from './chassis-contact-substep.js';
const f=Math.fround,signed=v=>floatBits(v)|0;
const difference=(a,b)=>a.map((v,i)=>f(sub(v,b[i])));
function inverseRotate(c,v){
 const m=resolveMcmWorldMatrix(c.bodyNode);
 return [f(add(add(mul(m[1],v[1]),mul(m[2],v[2])),mul(m[0],v[0]))),f(add(add(mul(m[6],v[2]),mul(m[5],v[1])),mul(m[4],v[0]))),f(add(add(mul(m[9],v[1]),mul(m[10],v[2])),mul(m[8],v[0])))];
}

// Original 0x4a8ddf..0x4a9a52, before the single-body impulse solver.
// One/two contacts use a surface lever; other counts damp a crashed bike.
export function respondMcmChassisContacts(c){
 if(!c.chassisContact.enabled||!c.control2c)return;
 const s=c.chassisResponse,t=s.scratch,angular=[...s.angularXY,c.field53c];
 const massStep=mul(c.state844?c.bikeMass:c.totalMass,c.dt),coeff=c.state844?s.crashCoefficients:s.normalCoefficients;
 t[0]=f(mul(coeff[0],massStep));t[1]=f(mul(massStep,coeff[1]));
 const count=c.chassisContact.count;
 if(count!==1&&count!==2){
  if(!c.state844)return;
  if(signed(c.rearNormalY)>0x3f5db22d){
   c.state844=2;angular.fill(0);c.velocity=[0,0,0];
  }else{
   c.offset=[...c.points[5]];c.offset[1]=f(sub(c.offset[1],1));
   const step=mul(c.dt,f(32.2));c.velocity=c.velocity.map((v,i)=>f(add(mul(c.offset[i],step),v)));
   t[2]=signed(c.speed)>0x3f19999a?c.speed:f(.6);
   t[3]=signed(t[2])>0x3f5eb852?f(.87):t[2];
   c.velocity=c.velocity.map(v=>f(mul(v,t[3])));
   t[4]=signed(t[2])>0x3f733333?f(.95):t[2];
   for(let i=0;i<3;i++)angular[i]=f(mul(angular[i],t[4]));
  }
  c.chassisContact.velocity=[0,0,0];
 }else{
  if(count===1){
   const surface=c.chassisSurface[c.control1c?0:1];
   c.offset=difference(surface,c.bodyPosition);c.normal=difference(c.balanceCenter,surface);
   s.localLever=inverseRotate(c,c.offset);
  }else{
   let a,b;
   if(c.control1c){
    if(c.frontContact){a=c.chassisSurface[0];b=c.points[2];}
    else if(c.rearContact){a=c.points[3];b=c.chassisSurface[0];}
    else if(c.control30){
     a=c.chassisSurface[c.control1c===1?0:1];b=c.chassisSurface[c.control1c===1?1:0];
    }
   }else if(c.control30){
    if(c.frontContact){a=c.points[2];b=c.chassisSurface[1];}
    // The original rear-only branch also reads the front surface (stack 0x324).
    else if(c.rearContact){a=c.chassisSurface[1];b=c.points[2];}
   }
   if(a){c.offset=difference(b,a);c.normal=c.offset.map((v,i)=>f(add(mul(v,.5),a[i])));}
   c.offset=difference(c.normal,c.bodyPosition);s.localLever=inverseRotate(c,c.offset);
   c.normal=difference(c.balanceCenter,c.normal);
  }
  c.offset=[f(mul(c.normal[2],t[0])),0,f(-mul(c.normal[0],t[1]))];
  const delta=inverseRotate(c,c.offset);
  for(let i=0;i<3;i++)angular[i]=f(add(delta[i],angular[i]));
  const k=count===1?5:7;
  t[k]=signed(c.speed)>0x3f19999a?c.speed:f(.6);
  t[k+1]=signed(t[k])>0x3f59999a?f(.85):t[k];
  for(let i=0;i<3;i++)angular[i]=f(mul(angular[i],t[k+1]));
  if(count===1)c.velocity=c.velocity.map(v=>f(mul(v,f(.95))));
 }
 s.angularXY=angular.slice(0,2);c.field53c=angular[2];
}
export function updateMcmChassisResponseSubstep(c){
 const result=updateMcmChassisContactSubstep(c);respondMcmChassisContacts(c);return result;
}
