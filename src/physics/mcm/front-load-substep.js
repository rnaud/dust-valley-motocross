import {updateMcmFrontSuspensionSubstep} from './front-suspension-substep.js';
import {updateMcmSteeringVelocity} from './steering-velocity.js';
import {resolveMcmWorldMatrix,inverseRotateMcmVector} from './world-transform.js';
const f=Math.fround;

// Original 0x4a73e2..0x4a7717. Rear contact selects steering correction,
// angular projection and shared weight; front-only contact uses the full force.
export function prepareMcmFrontLoad(c){
 if(!c.anyContact || !c.frontContact)return;
 const s=c.frontLoad;
 if(c.rearContact){
  const r=updateMcmSteeringVelocity({velocity:c.velocity,temporary:c.offset,
   a:c.points[8],direction:c.frontAxis,angle:c.componentAngle,field5d8:c.supportDepth,
   field560:c.forwardSpeed,field564:c.speed,dt:c.dt,field620:c.steeringFlag});
  c.velocity=r.velocity;c.offset=r.temporary;s.radius=r.radius;s.turnAngle=r.turnAngle;
  c.field6b0=f(r.turnAngle*c.turnScale);
  s.arm=c.points[6].map((v,i)=>f(v-c.balanceCenter[i]));
  const a=c.angularVelocity,n=c.points[4];
  const projection=(a[2]*n[2]+a[0]*n[0])+a[1]*n[1];
  c.offset=n.map(v=>f(v*projection));
  const b=s.arm,d=c.offset;
  s.angularCross=[f(d[1]*b[2]-d[2]*b[1]),f(d[2]*b[0]-d[0]*b[2]),f(d[0]*b[1]-d[1]*b[0])];
  s.force=c.force.map(v=>f(c.rearWeight*v));
 }else{
  s.arm=c.points[6].map((v,i)=>f(v-c.balanceCenter[i]));
  c.offset=c.points[6].map((v,i)=>f(v-c.bodyPosition[i]));
  s.angularCross=[0,0,0];s.scratch354=[0,0,0];s.force=[...c.force];
  s.localArm=inverseRotateMcmVector(resolveMcmWorldMatrix(c.bodyNode),c.offset);
 }
}
export function updateMcmFrontLoadSubstep(c){
 const result=updateMcmFrontSuspensionSubstep(c);prepareMcmFrontLoad(c);return result;
}
