import * as C from 'cannon-es';
import {tireForces} from './tires.js';
export const TAU = Math.PI * 2;
export function track(t) { return { x: Math.cos(t) * (102 + 12 * Math.sin(t * 3)), z: Math.sin(t) * (78 + 9 * Math.sin(t * 2)) }; }
export function freeTerrain(x,z) {
  return 1.7*Math.sin(x*.023)+1.8*Math.cos(z*.031)+.7*Math.sin((x+z)*.045)
    +Math.sin(x*.044)*Math.cos(z*.038)*6+Math.sin(z*.018+x*.014)*7;
}
export function terrain(x,z) {
  const t = Math.atan2(z / 78, x / 102), p = track(t);
  const d = Math.hypot(x-p.x,z-p.z);
  const base = 1.7*Math.sin(x*.023)+1.8*Math.cos(z*.031)+.7*Math.sin((x+z)*.045);
  let jumps = 0;
  for(const a of [.58,1.5,2.7,3.8,5.15]) { const j=track(a); jumps += 5.5*Math.exp(-((x-j.x)**2+(z-j.z)**2)/90); }
  const hills = (Math.sin(x*.044)*Math.cos(z*.038)*6 + Math.sin(z*.018+x*.014)*7) * Math.min(1,Math.max(0,(d-12)/40));
  return base + jumps + hills;
}
export function trackDistance(x,z) { let best=Infinity; for(let i=0;i<160;i++){const p=track(i/160*TAU);best=Math.min(best,Math.hypot(x-p.x,z-p.z));}return best; }

// SI units: 150 kg bike+rider, 9.81 m/s² gravity, forces in newtons.
// Two independent suspension rays transfer ground impulses to a six-DOF chassis.
// A bounded rider balance torque keeps the bike rideable; pitch is never snapped
// to the terrain and airborne steering cannot change the flight trajectory.
export function createState(options={}) {
  const height=options.height || terrain;
  const world=new C.World({gravity:new C.Vec3(0,-9.81,0)});
  world.solver.iterations=12;
  world.defaultContactMaterial.friction=.65;
  const data=[],size=options.flat?60:300,spacing=options.flat?10:3;
  const half=size*spacing/2;
  for(let i=0;i<=size;i++){const row=[];for(let j=0;j<=size;j++)row.push(height(i*spacing-half,half-j*spacing));data.push(row);}
  const ground=new C.Body({mass:0});ground.addShape(new C.Heightfield(data,{elementSize:spacing}));ground.quaternion.setFromEuler(-Math.PI/2,0,0);ground.position.set(-half,0,half);world.addBody(ground);
  const p=options.spawn ?? (options.flat?{x:0,z:0}:track(0));
  const chassis=new C.Body({mass:150,linearDamping:.015,angularDamping:.15});
  chassis.addShape(new C.Box(new C.Vec3(.28,.32,.72)));
  // Rider mass sits above the small collision box; include it in rotational inertia.
  chassis.inertia.set(110,100,75);chassis.invInertia.set(1/110,1/100,1/75);chassis.updateInertiaWorld(true);
  chassis.position.set(p.x,height(p.x,p.z)+1.15,p.z);chassis.quaternion.setFromEuler(0,options.spawn?.yaw ?? (options.flat?0:Math.atan2(36,78)),0);
  const vehicle=new C.RaycastVehicle({chassisBody:chassis,indexRightAxis:0,indexUpAxis:1,indexForwardAxis:2});
  for(const z of [-1.05,1.1])vehicle.addWheel({radius:.61,directionLocal:new C.Vec3(0,-1,0),axleLocal:new C.Vec3(-1,0,0),chassisConnectionPointLocal:new C.Vec3(0,-.12,z),suspensionRestLength:.55,maxSuspensionTravel:.3,suspensionStiffness:55,dampingRelaxation:4.5,dampingCompression:3.5,maxSuspensionForce:10000,frictionSlip:0,rollInfluence:.08,isFrontWheel:z>0});
  vehicle.addToWorld(world);
  const s={x:p.x,z:p.z,y:chassis.position.y-.5,yaw:0,speed:0,vy:0,pitch:0,roll:0,air:false,airtime:0,boost:100,steer:0,throttle:0,contacts:0,crashed:false,crashTime:0,slip:0,compression:[0,0],quaternion:{x:0,y:0,z:0,w:1},wheelTransforms:[],landingRecovery:0,wheelContacts:[],balanceRoll:0,tireLoads:[0,0]};
  Object.defineProperty(s,'physics',{value:{world,chassis,vehicle,height},enumerable:false});
  sync(s);return s;
}
function sync(s){const {chassis:b,vehicle:v}=s.physics;const f=b.quaternion.vmult(new C.Vec3(0,0,1)),up=b.quaternion.vmult(new C.Vec3(0,1,0));s.x=b.position.x;s.y=b.position.y-.5;s.z=b.position.z;s.yaw=Math.atan2(f.x,f.z);s.pitch=Math.asin(Math.max(-1,Math.min(1,f.y)));s.roll=Math.atan2(-up.x*Math.cos(s.yaw)+up.z*Math.sin(s.yaw),up.y);s.speed=Math.hypot(b.velocity.x,b.velocity.z);s.vy=b.velocity.y;s.yawRate=b.angularVelocity.y;s.quaternion={...b.quaternion};s.wheelTransforms=v.wheelInfos.map((w,i)=>{v.updateWheelTransform(i);return {position:{...w.worldTransform.position},quaternion:{...w.worldTransform.quaternion}};});s.compression=v.wheelInfos.map(w=>Math.max(0,1-w.suspensionLength/.55));}
export function resetBike(s,x,z,yaw){const {chassis:b,height}=s.physics;b.position.set(x,height(x,z)+1.2,z);b.quaternion.setFromEuler(0,yaw,0);b.velocity.setZero();b.angularVelocity.setZero();b.force.setZero();b.torque.setZero();s.crashed=false;s.crashTime=0;s.airtime=0;s.landingRecovery=0;s.wheelContacts=[];s.throttle=0;s.steer=0;s.balanceRoll=0;s.tireLoads=[0,0];b.wakeUp();sync(s);}
export function stepBike(s,input,dt) {
  const {world,chassis:b,vehicle:v}=s.physics;
  const gas=input.gas&&!s.crashed?1:0,brake=input.brake?1:0;
  s.throttle+=(gas-s.throttle)*Math.min(1,dt*18);
  const boosting=input.boost&&s.boost>0&&gas;
  s.boost=Math.max(0,Math.min(100,s.boost+(boosting?-28:10)*dt));
  // Forward is +Z, so rider-right is local -X (also screen-right in the chase camera).
  const steerInput=input.steer ?? ((input.right?1:0)-(input.left?1:0));
  // Stick requests corner lean; bars steer more at walking speed and less at speed.
  // atan(v² / gR) couples the requested lean to turn curvature.
  const intent=Math.sign(steerInput)*Math.pow(Math.min(1,Math.abs(steerInput)),.8);
  const maxLean=.98;
  const steeringLimit=Math.atan(2.15*9.81*Math.tan(maxLean)/(s.speed*s.speed+4));
  const geometricSteer=-intent*Math.min(.62,steeringLimit);
  const targetYaw=Math.tan(geometricSteer)*s.speed/2.15;
  // Virtual rider corrects the handlebars when the rear starts rotating faster
  // than the requested corner. This is steering feedback, not a chassis yaw motor.
  const correction=Math.max(-.22,Math.min(.22,(targetYaw-s.yawRate)*.22))*Math.min(1,s.speed/5);
  const steerTarget=Math.max(-.65,Math.min(.65,geometricSteer+correction));
  s.steer+=(steerTarget-s.steer)*(1-Math.exp(-dt*18));
  v.setSteeringValue(s.crashed?0:s.steer,1);
  // Torque falls with road speed; drag, not a velocity clamp, sets top speed.
  const driveForce=s.throttle*(boosting?2300:1700)/(1+s.speed/40);
  // RaycastVehicle supplies suspension and wheel rotation only. Its car tire
  // impulses fight roll balance on two inline wheels during steering reversals.
  v.applyEngineForce(0,0);v.setBrake(0,0);v.setBrake(0,1);
  const f=b.quaternion.vmult(new C.Vec3(0,0,1));
  const right=b.quaternion.vmult(new C.Vec3(1,0,0));
  const contacts=s.contacts;
  s.slip=Math.abs(b.velocity.dot(right));
  b.force.x-=b.velocity.x*s.speed*.55;b.force.z-=b.velocity.z*s.speed*.55;
  if(!s.crashed){
    if(contacts){
      const n=new C.Vec3();
      for(const w of v.wheelInfos)if(w.raycastResult.hasHit)n.vadd(w.raycastResult.hitNormalWorld,n);
      n.normalize();
      const forward=f.vsub(n.scale(f.dot(n)));forward.normalize();
      const side=n.cross(forward);side.normalize();
      let lateralForce=0,normalLoad=0;
      const support=v.wheelInfos.reduce((sum,w)=>sum+(w.raycastResult.hasHit?Math.max(0,w.suspensionForce*w.raycastResult.hitNormalWorld.dot(n)):0),0);
      // Equilibrium load transfer for the reduced planar tire model. Raw per-ray
      // loads also include the artificial balance torque and must not feed back
      // into front/rear grip as though the rider were accelerating longitudinally.
      const rearShare=Math.max(.3,Math.min(.7,.5+(driveForce*(1-Math.abs(intent)*.85)-(brake?1900:0))*.45/(b.mass*9.81*2.15)));
      s.tires=[];
      for(let i=0;i<2;i++){
        const wheel=v.wheelInfos[i];
        if(!wheel.raycastResult.hasHit){s.tireLoads[i]=0;s.tires.push({load:0,longitudinal:0,lateral:0,usage:0});continue;}
        const angle=i===1?s.steer:0;
        const wheelForward=forward.scale(Math.cos(angle)).vadd(side.scale(Math.sin(angle)));
        const wheelSide=n.cross(wheelForward);
        // A planar contact lever preserves front/rear yaw dynamics without feeding
        // roll-controller velocity back into tire slip (a reduced rider/bike model).
        const lever=forward.scale(i===1?1.1:-1.05);
        const velocity=b.velocity.vadd(b.angularVelocity.cross(lever));
        const rawLoad=Math.min(b.mass*9.81*1.5,support*(contacts===1?1:i===0?rearShare:1-rearShare));
        s.tireLoads[i]+=(rawLoad-s.tireLoads[i])*(1-Math.exp(-dt*20));
        const load=s.tireLoads[i];
        const forces=tireForces({longSpeed:velocity.dot(wheelForward),sideSpeed:velocity.dot(wheelSide),load,
          drive:i===0?driveForce:0,brake:brake?(i===1?1200:700):gas?0:35,camber:s.roll,front:i===1,dt});
        const force=wheelForward.scale(forces.longitudinal).vadd(wheelSide.scale(forces.lateral));
        // With one wheel touching, taper yaw leverage during touchdown; a full
        // one-wheel cornering impulse would pivot the bike around that ray.
        b.applyForce(force,contacts===2?lever:lever.scale(.25));
        lateralForce+=force.dot(side);normalLoad+=load;s.tires.push({load,...forces});
      }
      const lean=input.lean ?? ((input.leanBack?1:0)-(input.leanForward?1:0));
      b.torque.vadd(side.scale(-lean*180),b.torque);
      // Rider pitch stabilization follows the slope without locking the chassis orientation.
      const normal=v.wheelInfos.find(w=>w.raycastResult.hasHit)?.raycastResult.hitNormalWorld;
      const slope=normal?Math.atan2(-(normal.x*f.x+normal.z*f.z),Math.max(.1,normal.y)):0;
      const excess=s.pitch-slope;
      const antiFlip=Math.max(0,excess-.12)*5000+Math.min(0,excess+.2)*5000;
      b.torque.vadd(side.scale(Math.max(-2200,Math.min(2200,antiFlip))-b.angularVelocity.dot(side)*450),b.torque);
      // Balance against actual tire and support forces, as opposed to yaw speed.
      // Only both-wheel support gets strong ground balance; one-wheel touchdown
      // must not receive a violent roll correction.
      const slopeRoll=-Math.asin(Math.max(-1,Math.min(1,n.dot(new C.Vec3(Math.cos(s.yaw),0,-Math.sin(s.yaw))))));
      const desiredRoll=Math.max(-.92,Math.min(.92,slopeRoll-Math.atan2(lateralForce,Math.max(1,normalLoad))));
      const balance=contacts===2||Math.abs(s.roll)>1?1:.6;
      s.balanceRoll+=Math.max(-2.8*dt,Math.min(2.8*dt,(desiredRoll-s.balanceRoll)*(1-Math.exp(-dt*12))));
      const torqueLimit=Math.abs(s.roll)>1?6000:2200;
      const torque=Math.max(-torqueLimit,Math.min(torqueLimit,(s.balanceRoll-s.roll)*11000-b.angularVelocity.dot(f)*1700));
      b.torque.vadd(f.scale(torque*balance),b.torque);

    }else{
      // Rider weight shift and wheel reaction torque rotate the bike, not its velocity.
      const lean=input.lean ?? ((input.leanBack?1:0)-(input.leanForward?1:0));
      const targetPitch=lean*.8+(gas-brake)*.06;
      b.torque.vadd(right.scale((s.pitch-targetPitch)*260-b.angularVelocity.dot(right)*110),b.torque);
      // Air steering is a bounded whip, not an accumulating barrel roll.
      b.torque.vadd(f.scale((steerInput*.25-s.roll)*1500-b.angularVelocity.dot(f)*650),b.torque);
      b.torque.y+=-steerInput*65-b.angularVelocity.y*45;
    }
  }
  s.landingRecovery=Math.max(0,s.landingRecovery-dt);
  // Reserve high compression damping for landings; normal riding retains its travel.
  const landingShock=s.airtime>.12||s.landingRecovery>0;
  for(const wheel of v.wheelInfos){wheel.dampingCompression=landingShock?12:3.5;wheel.dampingRelaxation=landingShock?6:4.5;wheel.maxSuspensionForce=landingShock?30000:10000;}
  // Remove bank from support-ray direction (finite tire contact approximation),
  // but retain pitch so forks still follow ramp takeoffs and landings.
  const suspensionWorld=new C.Vec3(Math.sin(s.yaw)*Math.sin(s.pitch),-Math.cos(s.pitch),Math.cos(s.yaw)*Math.sin(s.pitch));
  const suspensionDown=b.quaternion.conjugate().vmult(suspensionWorld);
  for(const wheel of v.wheelInfos)wheel.directionLocal.copy(suspensionDown);
  const previousAir=s.airtime,impact=-b.velocity.y;
  world.step(dt);
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
