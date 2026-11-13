import {Body} from 'cannon-es';
import {integrateMcmLinear} from './physics/mcm/integrate-linear.js';
import {mcmMultiply as mul} from './physics/mcm/x87-arithmetic.js';
const f=Math.fround,FT=.3048,LBF=4.448221615,SLUG=14.59390294;

// SI boundary around original force/linear stores (0x4aaf02, 0x4ab38e).
// The preview supplies forces and post-contact velocity. Its body origin stands
// in for the original position reference; contact and angular solvers remain upstream.
export function stepMcmPreviewLinear({position,velocity,force,inverseMass,dt,frozen=false,linearFactor=[1,1,1]}){
 const inverse=f(inverseMass*SLUG),interval=f(dt);
 const acceleration=force.map((v,i)=>f(mul(inverse,f(v*linearFactor[i]/LBF))));
 const deltaVelocity=acceleration.map(v=>f(mul(v,interval)));
 const original=integrateMcmLinear({position:position.map(v=>f(v/FT)),velocity:velocity.map(v=>f(v/FT)),deltaVelocity,dt:interval,frozen});
 return {position:original.position.map(v=>v*FT),velocity:original.velocity.map(v=>v*FT),original};
}

// Cannon invokes Body.integrate after contact/spring impulses and before clearing
// force. Retain its angular integration, interpolation history and bounds update,
// then replace only its translation with the original linear result. Snapshot
// before the call so Cannon's force increment cannot be applied a second time.
export function installMcmPreviewLinear(body,enabled){
 const integrate=body.integrate;
 body.integrate=function(dt,normalize,fast){
  const active=enabled()&&this.type===Body.DYNAMIC&&this.sleepState!==Body.SLEEPING;
  const motion=active?stepMcmPreviewLinear({position:this.position.toArray(),velocity:this.velocity.toArray(),
   force:this.force.toArray(),inverseMass:this.invMass,linearFactor:this.linearFactor.toArray(),dt}):null;
  integrate.call(this,dt,normalize,fast);
  if(motion){this.position.set(...motion.position);this.velocity.set(...motion.velocity);this.aabbNeedsUpdate=true;}
 };
}
