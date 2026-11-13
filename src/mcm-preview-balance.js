import {updateMcmContactBalance,updateMcmBalanceCenter} from './physics/mcm/contact-balance.js';
import {calculateMcmBaseForce} from './physics/mcm/contact-forces.js';
import {mcmAdd as add,mcmMultiply as mul} from './physics/mcm/x87-arithmetic.js';
const f=Math.fround,FT=.3048,LBF=4.448221615;

// PDM profile, bike+618 == 0. Original 4a3c4a..4a3c7a initializes +8f8
// with value .5 and duration float32(nominalInterval * float32(6.3)).
export function createMcmPreviewBalance(){
  return {balanceFilter:[.5,f(f(.02)*f(6.3))],balanceScratch:[0,0,0,0],
    balanceGeometryScratch:Array(13).fill(0),bikeMass:240,riderMass:165,totalMass:405,
    field4bc:0,field870:0,control2c:0,leanDisabled:0,supportDepth:f(4.998459815979004),
    frontWeight:.5,rearWeight:.5,takeoffVelocity:[0,0,0],takeoffPosition:[0,0,0],
    frontShare:.5,rearShare:.5,offset:[0,0,0]};
}
// riderLean uses the original sign: positive moves weight toward the front.
// The preview body origin substitutes for the original reference transform.
export function stepMcmPreviewBalance(c,{riderLean,contact,position,velocity,forward,dt}){
  c.riderLean=f(riderLean);c.anyContact=!!contact;c.dt=f(dt);
  c.bodyPosition=position.map(x=>f(x/FT));c.velocity=velocity.map(x=>f(x/FT));
  c.rearTangent=forward.map(f);c.balanceCenter=[...c.bodyPosition];
  c.balanceNode={cacheValid:1,world:[1,0,0,0,0,1,0,0,0,0,1,0,...c.bodyPosition,1]};
  updateMcmContactBalance(c);updateMcmBalanceCenter(c);
  // Original front load uses rearWeight; rear load uses frontWeight.
  c.frontShare=c.rearWeight;c.rearShare=c.frontWeight;
  c.offset=Array.from(c.balanceCenter,(x,i)=>(x-c.bodyPosition[i])*FT);
  return c;
}

// PDM +690..+6a0: [0,-405,0] lbf, drag coefficient/threshold float32(.001).
export function mcmPreviewBaseForce(velocity){
 const v=velocity.map(x=>f(x/FT));
 const r=calculateMcmBaseForce({baseForce:[0,-405,0],velocity:v,speed:f(Math.hypot(...v)),dragCoefficient:f(.001),dragThreshold:f(.001)});
 return {originalForce:r.force,drag:(r.drag??[0,0,0]).map(x=>x*LBF)};
}
// Split before projecting, matching the front/rear load stores. Inputs are
// original-unit base force, a world normal and the recovered weight share.
export function mcmPreviewNormalLoad(force,normal,share){
 const v=force.map(x=>f(mul(x,share))),n=normal.map(f);
 return f(Math.abs(add(add(mul(v[1],n[1]),mul(v[0],n[0])),mul(v[2],n[2]))))*LBF;
}
