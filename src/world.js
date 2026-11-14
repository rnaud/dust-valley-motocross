import * as C from 'cannon-es';
import {installMcmPreviewLinear} from './mcm-preview-motion.js';
import {createMcmPreviewAir,stepMcmPreviewAir} from './mcm-preview-air.js';
import {SandSurface} from './sand-physics.js';
import {createMcmPreviewEngine,stepMcmPreviewEngine} from './mcm-preview.js';
import {mcmPreviewContactForces,mcmPreviewSteering} from './mcm-preview-contact.js';
import {createMcmPreviewBalance,stepMcmPreviewBalance,mcmPreviewBaseForce,mcmPreviewNormalLoad} from './mcm-preview-balance.js';
import {parkHeight} from './jump-park.js';
import {BikeVehicle} from './bike-vehicle.js';
import {MCM_HANDLING,advanceLean} from './mcm-handling.js';
import {createDrivetrain,stepDrivetrain} from './drivetrain.js';
import {tireForces} from './tires.js';
import {getBalanceSteer,getSafeBrakeFactor} from './controller.js';
import {TAU,trackAt,track,trackLength,trackGrade,trackCurvature,raceFeatures,nearestTrack} from './track.js';
import {heroRocks} from './props.js';
export {TAU,track,trackLength,nearestTrack};

const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

export function freeTerrain(x,z) {
  const natural=1.7*Math.sin(x*.023)+1.8*Math.cos(z*.031)+.7*Math.sin((x+z)*.045)
    +Math.sin(x*.044)*Math.cos(z*.038)*6+Math.sin(z*.018+x*.014)*7;
  // Wind-shaped dunes build up beyond the practice basin, away from the starter line.
  const dunes=(3.2*Math.sin(x*.017+z*.011)+2.4*Math.cos(z*.023-x*.014)+1.3*Math.sin((x-z)*.039))*smooth((Math.hypot(x,z)-150)/140);
  // High-frequency hardpack and erosion ruts make the open basin launchy.
  const rough=(1.25*Math.sin(x*.24+z*.17)+.95*Math.cos(x*.15-z*.23)+.6*Math.sin((x+z)*.37))*smooth((Math.hypot(x,z)-20)/55);
  return parkHeight(x,z,natural+dunes+rough);
}
export function terrain(x,z) {
  const near=nearestTrack(x,z),d=near.distance;
  const base=1.7*Math.sin(x*.023)+1.8*Math.cos(z*.031)+.7*Math.sin((x+z)*.045);
  let jumps=0;
  for(const f of raceFeatures){
    let delta=near.s-f.s;delta-=Math.round(delta);
    const along=delta*trackLength,end=f.up+f.top+f.down;
    if(along<0||along>end||Math.abs(near.side)>f.width+6)continue;
    const lateral=1-smooth((Math.abs(near.side)-f.width*.55)/(f.width*.45+6));
    const profile=along<f.up?Math.pow(along/f.up,1.5):along<f.up+f.top?1:1-smooth((along-f.up-f.top)/f.down);
    jumps+=f.height*profile*lateral;
  }
  const hills=(Math.sin(x*.044)*Math.cos(z*.038)*6+Math.sin(z*.018+x*.014)*7)*Math.min(1,Math.max(0,(d-12)/40));
  // Dune ridges only appear once the rider leaves the groomed racing surface.
  const dunes=(3.8*Math.sin(x*.016+z*.011)+2.9*Math.cos(z*.021-x*.013)+1.4*Math.sin((x+z)*.043)+1.1*Math.cos((x-z)*.031))*smooth((d-16)/55);
  // The grade only lifts the racing surface; the surrounding basin keeps its natural roll.
  const grade=trackGrade(near.s)*(1-smooth((d-9)/16));
  // Off-piste hardpack: sharp little kickers and erosion whoops without
  // disturbing the groomed racing line.
  const rough=(1.15*Math.sin(x*.22+z*.16)+.9*Math.cos(x*.14-z*.21)+.5*Math.sin((x+z)*.34))*smooth((d-18)/30);
  // Raised outer berms make the corners read and give the tires something to lean on.
  const curve=trackCurvature(near.s),bankSide=-Math.sign(curve)*near.side;
  let berm=0;
  if(bankSide>3.5&&bankSide<11){
   const shape=smooth((bankSide-3.5)/2.2)*(1-smooth((bankSide-8)/3));
   berm=shape*Math.min(1,Math.abs(curve)*55)*1.35;
  }
  return base+jumps+hills+grade+dunes+berm+rough;
}
export function trackDistance(x,z) { return nearestTrack(x,z).distance; }

// SI units: 183.7 kg bike+rider, 9.81 m/s² gravity, forces in newtons.
// Two independent suspension rays transfer ground impulses to a six-DOF chassis.
// A bounded rider balance torque keeps the bike rideable; pitch is never snapped
// to the terrain and airborne steering cannot change the flight trajectory.
export function createState(options={}) {
  const baseHeight=options.height || terrain;
  const sand=options.sand!==false?new SandSurface(baseHeight):null;
  const height=sand?(x,z)=>sand.height(x,z):baseHeight;
  const world=new C.World({gravity:new C.Vec3(0,-9.81,0)});
  world.solver.iterations=12;
  world.defaultContactMaterial.friction=.65;
  if(!sand){
  const data=[],size=options.flat?60:360,spacing=options.flat?10:2.5;
  const half=size*spacing/2;
  for(let i=0;i<=size;i++){const row=[];for(let j=0;j<=size;j++)row.push(height(i*spacing-half,half-j*spacing));data.push(row);}
  const ground=new C.Body({mass:0});ground.addShape(new C.Heightfield(data,{elementSize:spacing}));ground.quaternion.setFromEuler(-Math.PI/2,0,0);ground.position.set(-half,0,half);world.addBody(ground);
  }
  const start=options.flat?{x:0,z:0,tx:0,tz:1}:track(0);
  const p=options.spawn ?? start;
  sand?.follow(p.x,p.z,world);
  const yaw=options.spawn?.yaw ?? (options.flat?0:Math.atan2(start.tx,start.tz));
  const chassis=new C.Body({mass:MCM_HANDLING.mass,linearDamping:options.physicsMode==='mcm-preview'?0:.015,angularDamping:options.physicsMode==='mcm-preview'?0:.15});
  chassis.addShape(new C.Box(new C.Vec3(.28,.32,.72)));
  // Rider mass sits above the small collision box; include it in rotational inertia.
  const inertiaScale=MCM_HANDLING.mass/150;
  chassis.inertia.set(110*inertiaScale,100*inertiaScale,75*inertiaScale);chassis.invInertia.set(1/(110*inertiaScale),1/(100*inertiaScale),1/(75*inertiaScale));chassis.updateInertiaWorld(true);
  chassis.position.set(p.x,height(p.x,p.z)+1.15,p.z);chassis.quaternion.setFromEuler(0,yaw,0);
  // A handful of large boulders are real colliders; the rest of the scatter is scenery.
  for(const rock of options.flat?[]:heroRocks){
   const q=trackAt(rock.s),x=q.x+q.tz*rock.side,z=q.z-q.tx*rock.side,b=new C.Body({mass:0});
   b.addShape(new C.Sphere(rock.r*.78));b.position.set(x,height(x,z)+rock.r*.55,z);world.addBody(b);
  }
  const vehicle=new BikeVehicle({chassisBody:chassis,indexRightAxis:0,indexUpAxis:1,indexForwardAxis:2});
  for(const z of [-1.05,1.1])vehicle.addWheel({radius:.61,directionLocal:new C.Vec3(0,-1,0),axleLocal:new C.Vec3(-1,0,0),chassisConnectionPointLocal:new C.Vec3(0,-.12,z),suspensionRestLength:.55,maxSuspensionTravel:.3,maxSuspensionForce:30000,frictionSlip:0,rollInfluence:.08,isFrontWheel:z>0});
  vehicle.recoveredPreview=options.physicsMode==='mcm-preview';
  vehicle.addToWorld(world);
  const s={x:p.x,z:p.z,y:chassis.position.y-.5,yaw:0,speed:0,vy:0,pitch:0,roll:0,air:false,airtime:0,boost:100,steer:0,throttle:0,contacts:0,crashed:false,crashTime:0,slip:0,compression:[0,0],gear:1,rpm:1200,quaternion:{x:0,y:0,z:0,w:1},wheelTransforms:[],landingRecovery:0,wheelContacts:[],balanceRoll:0,tireLoads:[0,0],wheelOmega:[0,0],slipRatio:[0,0],engine:options.physicsMode==='mcm-preview'?createMcmPreviewEngine():createDrivetrain(),physicsMode:options.physicsMode==='mcm-preview'?'mcm-preview':'classic',requestedLean:0};
  if(s.physicsMode==='mcm-preview')installMcmPreviewLinear(chassis,()=>!s.crashed);
  s.recoveredAir=s.physicsMode==='mcm-preview'?createMcmPreviewAir():null;
  s.recoveredAcceleration=[0,0,0];
  s.recoveredBalance=s.physicsMode==='mcm-preview'?createMcmPreviewBalance():null;
  world.addEventListener('preStep',()=>{
    if(s.physicsMode==='mcm-preview'){
      // RaycastVehicle applies springs as impulses, outside Body.force. Include
      // their force equivalent in the previous acceleration used by traction.
      // This is observation only: the spring impulses have already been applied.
      const force=chassis.force.clone();
      for(const wheel of vehicle.wheelInfos)force.vadd(wheel.raycastResult.hitNormalWorld.scale(Math.min(wheel.suspensionForce,wheel.maxSuspensionForce)),force);
      s.recoveredAcceleration=force.toArray().map(v=>v/chassis.mass);
    }
  });
  Object.defineProperty(s,'physics',{value:{world,chassis,vehicle,height,sand},enumerable:false});
  sync(s);return s;
}
function sync(s){const {chassis:b,vehicle:v}=s.physics;const f=b.quaternion.vmult(new C.Vec3(0,0,1)),up=b.quaternion.vmult(new C.Vec3(0,1,0));s.x=b.position.x;s.y=b.position.y-.5;s.z=b.position.z;s.yaw=Math.atan2(f.x,f.z);s.pitch=Math.asin(Math.max(-1,Math.min(1,f.y)));s.roll=Math.atan2(-up.x*Math.cos(s.yaw)+up.z*Math.sin(s.yaw),up.y);s.speed=Math.hypot(b.velocity.x,b.velocity.z);s.vy=b.velocity.y;s.yawRate=b.angularVelocity.y+(s.recoveredTurnRate||0);s.gear=s.engine.gear;s.rpm=Math.round(s.engine.rpm);s.quaternion={...b.quaternion};s.wheelTransforms=v.wheelInfos.map((w,i)=>{v.updateWheelTransform(i);return {position:{...w.worldTransform.position},quaternion:{...w.worldTransform.quaternion},direction:{...w.directionWorld}};});s.compression=v.wheelInfos.map(w=>Math.max(0,1-w.suspensionLength/.55));}
export function resetBike(s,x,z,yaw){const {chassis:b,height}=s.physics;s.physics.sand?.resetContacts();s.physics.sand?.follow(x,z,s.physics.world);b.position.set(x,height(x,z)+1.2,z);b.quaternion.setFromEuler(0,yaw,0);b.velocity.setZero();b.angularVelocity.setZero();b.force.setZero();b.torque.setZero();s.crashed=false;s.crashTime=0;s.previewHeadingTarget=null;s.recoveredContact=null;s.recoveredTurnRate=0;s.recoveredAcceleration=[0,0,0];s.recoveredAir=s.physicsMode==='mcm-preview'?createMcmPreviewAir():null;s.recoveredBalance=s.physicsMode==='mcm-preview'?createMcmPreviewBalance():null;s.physics.vehicle.recoveredMassShares=[.5,.5];s.airtime=0;s.landingRecovery=0;s.wheelContacts=[];s.throttle=0;s.steer=0;s.balanceRoll=0;s.tireLoads=[0,0];s.engine=s.physicsMode==='mcm-preview'?createMcmPreviewEngine():createDrivetrain();s.requestedLean=0;s.wheelOmega=[0,0];s.slipRatio=[0,0];s.contacts=0;s.air=false;for(const w of s.physics.vehicle.wheelInfos){w.isInContact=false;w.raycastResult.reset();w.suspensionForce=0;}b.wakeUp();sync(s);}
export function stepBike(s,input,dt) {
  const {world,chassis:b,vehicle:v}=s.physics;
  s.physics.sand?.follow(b.position.x,b.position.z,world);
  const gas=input.gas&&!s.crashed?1:0,brake=input.brake?1:0;
  const leanInput=input.lean ?? ((input.leanBack?1:0)-(input.leanForward?1:0));
  if(s.physicsMode!=='mcm-preview')s.throttle+=(gas-s.throttle)*Math.min(1,dt*18);
  const boosting=s.physicsMode!=='mcm-preview'&&input.boost&&s.boost>0&&gas;
  s.boost=Math.max(0,Math.min(100,s.boost+(boosting?-28:10)*dt));
  // Forward is +Z, so rider-right is local -X (also screen-right in the chase camera).
  const steerInput=input.steer ?? ((input.right?1:0)-(input.left?1:0));
  // Stick requests corner lean; bars steer more at walking speed and less at speed.
  // atan(v² / gR) couples the requested lean to turn curvature.
  const intent=Math.sign(steerInput)*Math.pow(Math.min(1,Math.abs(steerInput)),.8);
  const maxLean=MCM_HANDLING.maxLean;
  const normal=new C.Vec3(0,1,0);
  if(s.contacts){normal.setZero();for(const w of v.wheelInfos)if(w.raycastResult.hasHit)normal.vadd(w.raycastResult.hitNormalWorld,normal);normal.normalize();}
  const slopeRoll=-Math.asin(Math.max(-1,Math.min(1,normal.dot(new C.Vec3(Math.cos(s.yaw),0,-Math.sin(s.yaw))))));
  s.requestedLean=advanceLean(s.requestedLean,intent*maxLean*Math.min(1,s.speed/9),dt);
  const requestedLean=s.requestedLean;
  const desiredRoll=Math.max(-1.05,Math.min(1.05,slopeRoll+requestedLean));
  const fwd=b.quaternion.vmult(new C.Vec3(0,0,1));
  if(s.physicsMode==='mcm-preview'){
    const balance=stepMcmPreviewBalance(s.recoveredBalance,{riderLean:s.crashed?0:-leanInput,contact:s.contacts>0,
      position:b.position.toArray(),velocity:b.velocity.toArray(),forward:fwd.toArray(),dt});
    v.recoveredMassShares=[balance.rearShare,balance.frontShare];
  }
  const rollRate=b.angularVelocity.dot(fwd);
  const leanForSteering=Math.max(-maxLean,Math.min(maxLean,s.roll-slopeRoll));
  const lowSpeedYaw=Math.tan(-intent*.62)*s.speed/2.15;
  const leanBlend=Math.max(0,Math.min(1,(s.speed-3)/7));
  const leanYaw=-9.81*Math.tan(leanForSteering)/Math.max(4,s.speed);
  const targetYaw=lowSpeedYaw*(1-leanBlend)+leanYaw*leanBlend;
  const yawCorrection=Math.max(-.18,Math.min(.18,(targetYaw-s.yawRate)*.18))*Math.min(1,s.speed/5);
  // Bike Lab's balance-steer law. b is the steer angle that balances the
  // current lean; t is the balance steer for the requested lean. Steering
  // slightly off balance (b-t) tips the bike toward the request, and the
  // damper works on the steering angle rather than directly on the chassis.
  const balance=getBalanceSteer(s.speed,leanForSteering);
  const targetBalance=getBalanceSteer(s.speed,Math.max(-1.2,Math.min(1.2,desiredRoll-slopeRoll)));
  const steerGain=1.7/(1+Math.max(0,s.speed-15)/30);
  // Preview steering follows rider input; balance torque handles terrain lean.
  const steerTarget=s.physicsMode==='mcm-preview'?-intent*.5/(1+(s.speed/9)**2):
    Math.max(-.65,Math.min(.65,lowSpeedYaw*.2*(1-leanBlend)+(balance*steerGain+(balance-targetBalance)*.18-rollRate*.05)*leanBlend+yawCorrection));
  s.steer+=(steerTarget-s.steer)*(1-Math.exp(-dt*18));
  v.setSteeringValue(s.crashed?0:s.steer,1);
  s.recoveredContact=null;s.recoveredTurnRate=0;
  if(s.physicsMode==='mcm-preview'&&!s.crashed&&s.contacts===2){
    const tangent=fwd.vsub(normal.scale(fwd.dot(normal)));tangent.normalize();
    const referenceAxis=tangent.cross(normal);
    const steered=tangent.scale(Math.cos(s.steer)).vadd(normal.cross(tangent).scale(Math.sin(s.steer)));
    const correction=mcmPreviewSteering({velocity:b.velocity.toArray(),axis:steered.cross(normal).toArray(),
      referenceAxis:referenceAxis.toArray(),angle:s.steer,forwardSpeed:b.velocity.dot(tangent),dt});
    b.velocity.set(...correction.velocity);
    s.recoveredTurnRate=correction.turnAngle/dt*normal.y;
    const turn=new C.Quaternion();turn.setFromAxisAngle(normal,correction.turnAngle);
    turn.mult(b.quaternion,b.quaternion);b.quaternion.normalize();b.updateInertiaWorld();
    b.aabbNeedsUpdate=true;
  }

  // Actual engine state powers the rear tire and also feeds the HUD and audio.
  if(s.physicsMode==='mcm-preview'){
    stepMcmPreviewEngine(s.engine,{speed:b.velocity.dot(fwd),pressed:!!gas,brake:!!brake,grounded:v.wheelInfos[0].raycastResult.hasHit},dt);s.throttle=s.engine.recovered.state;
  }else stepDrivetrain(s.engine,{speed:b.velocity.dot(fwd),throttle:s.throttle,brake:!!brake,grounded:v.wheelInfos[0].raycastResult.hasHit,boost:boosting},dt);
  const driveForce=s.engine.force*(s.physicsMode==='mcm-preview'?1:MCM_HANDLING.traction);
  // Safe-brake clamp: don't ask a fully banked tire for a straight-line stop.
  const safeBrake=getSafeBrakeFactor(s.roll);
  // RaycastVehicle supplies suspension and wheel rotation only. Its car tire
  // impulses fight roll balance on two inline wheels during steering reversals.
  v.applyEngineForce(0,0);v.setBrake(0,0);v.setBrake(0,1);
  const f=b.quaternion.vmult(new C.Vec3(0,0,1));
  const right=b.quaternion.vmult(new C.Vec3(1,0,0));
  const contacts=s.contacts;
  s.slip=Math.abs(b.velocity.dot(right));
  const recoveredBase=s.physicsMode==='mcm-preview'?mcmPreviewBaseForce(b.velocity.toArray()):null;
  if(recoveredBase)b.force.vadd(new C.Vec3(...recoveredBase.drag),b.force);
  else {b.force.x-=b.velocity.x*s.speed*.55;b.force.z-=b.velocity.z*s.speed*.55;}
  if(!s.crashed){
    if(contacts){
      const n=new C.Vec3();
      for(const w of v.wheelInfos)if(w.raycastResult.hasHit)n.vadd(w.raycastResult.hitNormalWorld,n);
      n.normalize();
      const forward=f.vsub(n.scale(f.dot(n)));forward.normalize();
      const side=n.cross(forward);side.normalize();
      const support=v.wheelInfos.reduce((sum,w)=>sum+(w.raycastResult.hasHit?Math.max(0,w.suspensionForce*w.raycastResult.hitNormalWorld.dot(n)):0),0);
      // Equilibrium load transfer for the reduced planar tire model. Raw per-ray
      // loads also include the artificial balance torque and must not feed back
      // into front/rear grip as though the rider were accelerating longitudinally.
      const rearShare=s.physicsMode==='mcm-preview'?s.recoveredBalance.rearShare:Math.max(.3,Math.min(.7,.5+(driveForce*(1-Math.abs(intent)*.85)-(brake?1900*safeBrake:0))*.45/(b.mass*9.81*2.15)));
      s.tires=[];
      const recoveredContacts=[null,null];
      for(let i=0;i<2;i++){
        const wheel=v.wheelInfos[i];
        if(!wheel.raycastResult.hasHit){s.tireLoads[i]=0;s.tires.push({load:0,longitudinal:0,lateral:0,usage:0});continue;}
        const angle=i===1?s.steer:0;
        const wheelForward=forward.scale(Math.cos(angle)).vadd(side.scale(Math.sin(angle)));
        const wheelSide=n.cross(wheelForward);
        // A planar contact lever preserves front/rear yaw dynamics without feeding
        // roll-controller velocity back into tire slip (a reduced rider/bike model).
        const lever=forward.scale(i===1?1.1:-1.05);
        if(s.physicsMode==='mcm-preview')lever.vsub(new C.Vec3(...s.recoveredBalance.offset),lever);
        const velocity=b.velocity.vadd(b.angularVelocity.cross(lever));
        const share=contacts===1?1:i===0?rearShare:1-rearShare;
        const rawLoad=recoveredBase?mcmPreviewNormalLoad(recoveredBase.originalForce,wheel.raycastResult.hitNormalWorld.toArray(),share):Math.min(b.mass*9.81*1.5,support*share);
        if(recoveredBase)s.tireLoads[i]=rawLoad;
        else s.tireLoads[i]+=(rawLoad-s.tireLoads[i])*(1-Math.exp(-dt*20));
        const load=s.tireLoads[i];
        const forces=s.physicsMode==='mcm-preview'?{longitudinal:0,lateral:0,usage:0}:tireForces({longSpeed:velocity.dot(wheelForward),sideSpeed:velocity.dot(wheelSide),load,
          drive:i===0?driveForce:0,brake:brake?(i===1?1200*safeBrake:700*safeBrake):i===0?s.engine.engineBrake:0,camber:s.roll-slopeRoll,front:i===1,dt});
        if(s.physicsMode==='mcm-preview'){
          const tangentVelocity=velocity.vsub(n.scale(velocity.dot(n)));
          recoveredContacts[i]={velocity:tangentVelocity.toArray(),axis:wheelForward.toArray(),arm:lever.toArray(),load};
        }
        const groundSpeed=velocity.dot(wheelForward),rolling=groundSpeed/.61;
        if(s.physics.sand&&wheel.raycastResult.body?.sandSurface===s.physics.sand){
          const hit=wheel.raycastResult.hitPointWorld,packed=s.physics.sand.compaction(hit.x,hit.z);
          // Tuned ploughing resistance diminishes as repeated passes pack the bed.
          forces.longitudinal-=Math.tanh(groundSpeed)*load*(.06-.025*packed);
        }
        const driven=i===0?s.throttle*(1-Math.min(1,Math.abs(groundSpeed)/18))*16:0;
        s.wheelOmega[i]=rolling+driven;
        s.slipRatio[i]=Math.max(-1,Math.min(1,(s.wheelOmega[i]*.61-groundSpeed)/Math.max(2,Math.abs(groundSpeed))));
        const force=wheelForward.scale(forces.longitudinal).vadd(wheelSide.scale(forces.lateral));
        // With one wheel touching, taper yaw leverage during touchdown; a full
        // one-wheel cornering impulse would pivot the bike around that ray.
        b.applyForce(force,contacts===2?lever:lever.scale(.25));
        s.tires.push({load,...forces});
      }
      if(s.physicsMode==='mcm-preview'){
        const axes=[new C.Vec3(1,0,0),new C.Vec3(0,1,0),new C.Vec3(0,0,1)].map(axis=>b.quaternion.vmult(axis).toArray());
        const bodyMatrix=[...axes[0],0,...axes[1],0,...axes[2],0,0,0,0,1];
        const contact=mcmPreviewContactForces({front:recoveredContacts[1],rear:recoveredContacts[0],velocity:b.velocity.toArray(),mass:b.mass,dt,brake:s.engine.recovered.brake,
          drive:driveForce,acceleration:s.recoveredAcceleration,rearShare,bikeForward:f.toArray(),roll:s.roll,bodyMatrix});
        // Apply the accumulated contact force and its recovered moment once.
        // Sand resistance was applied above; the recovered stage scales drive once.
        b.force.vadd(new C.Vec3(...contact.force),b.force);
        b.torque.vadd(new C.Vec3(...contact.torque),b.torque);
        if(recoveredContacts[0]){
          const arm=new C.Vec3(...recoveredContacts[0].arm);
          b.applyForce(new C.Vec3(...contact.driveForce),contacts===2?arm:arm.scale(.25));
        }
        s.recoveredContact=contact;
      }
      const lean=leanInput;
      b.torque.vadd(side.scale(-lean*180),b.torque);
      // Rider pitch stabilization follows the slope without locking the chassis orientation.
      const normal=v.wheelInfos.find(w=>w.raycastResult.hasHit)?.raycastResult.hitNormalWorld;
      const slope=normal?Math.atan2(-(normal.x*f.x+normal.z*f.z),Math.max(.1,normal.y)):0;
      const excess=s.pitch-slope;
      const antiFlip=Math.max(0,excess-.12)*5000+Math.min(0,excess+.2)*5000;
      b.torque.vadd(side.scale(Math.max(-2200,Math.min(2200,antiFlip))-b.angularVelocity.dot(side)*450),b.torque);
      // Only both-wheel support gets strong ground balance; one-wheel touchdown
      // must not receive a violent roll correction.
      const balance=contacts===2||Math.abs(s.roll)>1?1:.6;
      s.balanceRoll=desiredRoll;
      const torqueLimit=Math.abs(s.roll)>1?6000:2200;
      const torque=Math.max(-torqueLimit,Math.min(torqueLimit,(s.balanceRoll-s.roll)*11000-b.angularVelocity.dot(f)*1700));
      b.torque.vadd(f.scale(torque*balance),b.torque);
      // Wheel gyroscopics resist fast roll changes more at speed. This is a
      // reduced-model term, not a full spinning-wheel inertia tensor.
      const gyro=Math.min(1,s.speed/28);
      b.torque.vadd(f.scale(-b.angularVelocity.dot(f)*gyro*320),b.torque);
      // Low-speed feet: a small rider support torque catches the bike before a
      // walking-pace tip becomes a fall. It fades out by 5 m/s.
      const relRoll=s.roll-slopeRoll;
      if(s.speed<5&&Math.abs(relRoll)>.28&&contacts===2){
       const support=Math.min(1,(Math.abs(relRoll)-.28)/.3)*(1-s.speed/5);
       b.torque.vadd(f.scale(-relRoll*support*1600),b.torque);
       // Physical foot support: push the chassis up at a low foot point on the
       // falling side. This adds a real contact force instead of only torque.
       const footPoint=b.position.vadd(side.scale(Math.sign(relRoll)*.42)).vadd(new C.Vec3(0,-.5,0));
       const gap=footPoint.y-s.physics.height(footPoint.x,footPoint.z);
       if(gap<.4)b.applyForce(new C.Vec3(0,Math.max(0,.4-gap)*support*900,0),footPoint);
      }

    }else if(s.physicsMode!=='mcm-preview'){
      // Rider weight shift and wheel reaction torque rotate the bike, not its velocity.
      const lean=leanInput;
      const targetPitch=lean*.8+(gas-brake)*.06;
      b.torque.vadd(right.scale((s.pitch-targetPitch)*260-b.angularVelocity.dot(right)*110),b.torque);
      // Air steering is a bounded whip, not an accumulating barrel roll.
      b.torque.vadd(f.scale((steerInput*.25-s.roll)*1500-b.angularVelocity.dot(f)*650),b.torque);
      b.torque.y+=-steerInput*65-b.angularVelocity.y*45;
    }
  }
  s.landingRecovery=Math.max(0,s.landingRecovery-dt);
  // Progressive springs and digressive damping handle landings continuously.
  // Remove bank from support-ray direction (finite tire contact approximation),
  // but retain pitch so forks still follow ramp takeoffs and landings.
  const suspensionWorld=new C.Vec3(Math.sin(s.yaw)*Math.sin(s.pitch),-Math.cos(s.pitch),Math.cos(s.yaw)*Math.sin(s.pitch));
  const suspensionDown=b.quaternion.conjugate().vmult(suspensionWorld);
  for(const wheel of v.wheelInfos)wheel.directionLocal.copy(suspensionDown);
  const previousAir=s.airtime,impact=-b.velocity.y;
  world.step(dt);
  if(s.physicsMode==='mcm-preview'&&!s.crashed){
    const heading=b.quaternion.vmult(new C.Vec3(0,0,1)),yaw=Math.atan2(heading.x,heading.z);
    if(Math.abs(steerInput)>.001||Math.abs(s.steer)>.005||s.previewHeadingTarget==null)s.previewHeadingTarget=yaw;
    else if(v.wheelInfos.some(w=>w.isInContact)){
      // Playability assistance: uneven contacts must not choose a new heading.
      // Rotate travel with the chassis so the correction adds no kinetic energy.
      const error=Math.atan2(Math.sin(s.previewHeadingTarget-yaw),Math.cos(s.previewHeadingTarget-yaw));
      const angle=Math.max(-.04,Math.min(.04,error*(1-Math.exp(-8*dt))));
      const correction=new C.Quaternion();correction.setFromAxisAngle(new C.Vec3(0,1,0),angle);
      correction.mult(b.quaternion,b.quaternion);b.quaternion.normalize();
      correction.vmult(b.velocity,b.velocity);correction.vmult(b.angularVelocity,b.angularVelocity);
      b.angularVelocity.y*=Math.exp(-8*dt);b.updateInertiaWorld();b.aabbNeedsUpdate=true;
    }
  }
  if(s.physicsMode==='mcm-preview'&&!s.crashed){
    const air=stepMcmPreviewAir(s.recoveredAir,{position:b.position.toArray(),quaternion:b.quaternion,
      velocity:b.velocity.toArray(),angularVelocity:b.angularVelocity.toArray(),
      frontContact:v.wheelInfos[1].isInContact,rearContact:v.wheelInfos[0].isInContact,
      chassisContact:world.contacts.some(c=>c.bi===b||c.bj===b),lean:leanInput,steer:steerInput,
      brake:s.engine.recovered.brake,engineLevel:s.engine.recovered.state,dt});
    if(air.active){
      b.velocity.set(...air.velocity);b.angularVelocity.set(...air.angularVelocity);
      if(air.applied){
        b.quaternion.copy(air.quaternion);b.position.set(...air.position);b.updateInertiaWorld();b.aabbNeedsUpdate=true;
      }
    }
  }
  if(s.physics.sand){
    s.physics.sand.deform(v.wheelInfos.map((wheel,i)=>wheel.isInContact&&wheel.raycastResult.body?.sandSurface===s.physics.sand?{
      x:wheel.raycastResult.hitPointWorld.x,z:wheel.raycastResult.hitPointWorld.z,
      load:wheel.suspensionForce,demand:i===0?s.throttle:0,
    }:null),dt);
  }
  s.wheelContacts=v.wheelInfos.map(w=>w.isInContact?{x:w.raycastResult.hitPointWorld.x,y:w.raycastResult.hitPointWorld.y,z:w.raycastResult.hitPointWorld.z,normal:{...w.raycastResult.hitNormalWorld}}:null);
  s.contacts=v.wheelInfos.filter(w=>w.isInContact).length;sync(s);
  s.air=s.contacts===0;
  let landed=0;
  if(s.air)s.airtime+=dt;
  else {if(previousAir>.12){landed=previousAir;s.landingRecovery=.6;}s.airtime=0;}
  const up=b.quaternion.vmult(new C.Vec3(0,1,0));
  if(!s.crashed&&((world.contacts.some(c=>c.bi===b||c.bj===b)&&up.y<.45)||(landed>.3&&impact>17&&up.y<.65))){s.crashed=true;s.crashTime=0;}
  if(s.crashed)s.crashTime+=dt;
  return {landed,crashed:s.crashed,boosting};
}
