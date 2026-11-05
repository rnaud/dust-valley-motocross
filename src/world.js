import * as C from 'cannon-es';
export const TAU = Math.PI * 2;
export function track(t) { return { x: Math.cos(t) * (102 + 12 * Math.sin(t * 3)), z: Math.sin(t) * (78 + 9 * Math.sin(t * 2)) }; }
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
  const data=[],size=options.flat?20:300,spacing=options.flat?10:3;
  const half=size*spacing/2;
  for(let i=0;i<=size;i++){const row=[];for(let j=0;j<=size;j++)row.push(height(i*spacing-half,half-j*spacing));data.push(row);}
  const ground=new C.Body({mass:0});ground.addShape(new C.Heightfield(data,{elementSize:spacing}));ground.quaternion.setFromEuler(-Math.PI/2,0,0);ground.position.set(-half,0,half);world.addBody(ground);
  const p=options.flat?{x:0,z:0}:track(0);
  const chassis=new C.Body({mass:150,linearDamping:.015,angularDamping:.15});
  chassis.addShape(new C.Box(new C.Vec3(.28,.32,1.02)));
  // Rider mass sits above the small collision box; include it in rotational inertia.
  chassis.inertia.set(110,100,75);chassis.invInertia.set(1/110,1/100,1/75);chassis.updateInertiaWorld(true);
  chassis.position.set(p.x,height(p.x,p.z)+1.15,p.z);chassis.quaternion.setFromEuler(0,options.flat?0:Math.atan2(36,78),0);
  const vehicle=new C.RaycastVehicle({chassisBody:chassis,indexRightAxis:0,indexUpAxis:1,indexForwardAxis:2});
  for(const z of [-1.05,1.1])vehicle.addWheel({radius:.61,directionLocal:new C.Vec3(0,-1,0),axleLocal:new C.Vec3(-1,0,0),chassisConnectionPointLocal:new C.Vec3(0,-.12,z),suspensionRestLength:.55,maxSuspensionTravel:.3,suspensionStiffness:55,dampingRelaxation:4.5,dampingCompression:3.5,maxSuspensionForce:10000,frictionSlip:1.65,rollInfluence:1,isFrontWheel:z>0});
  vehicle.addToWorld(world);
  const s={x:p.x,z:p.z,y:chassis.position.y-.5,yaw:0,speed:0,vy:0,pitch:0,roll:0,air:false,airtime:0,boost:100,steer:0,throttle:0,contacts:0,crashed:false,crashTime:0,slip:0,compression:[0,0],quaternion:{x:0,y:0,z:0,w:1},wheelTransforms:[]};
  Object.defineProperty(s,'physics',{value:{world,chassis,vehicle,height},enumerable:false});
  sync(s);return s;
}
function sync(s){const {chassis:b,vehicle:v}=s.physics;const f=b.quaternion.vmult(new C.Vec3(0,0,1)),up=b.quaternion.vmult(new C.Vec3(0,1,0));s.x=b.position.x;s.y=b.position.y-.5;s.z=b.position.z;s.yaw=Math.atan2(f.x,f.z);s.pitch=Math.asin(Math.max(-1,Math.min(1,f.y)));s.roll=Math.atan2(-up.x*Math.cos(s.yaw)+up.z*Math.sin(s.yaw),up.y);s.speed=Math.hypot(b.velocity.x,b.velocity.z);s.vy=b.velocity.y;s.quaternion={...b.quaternion};s.wheelTransforms=v.wheelInfos.map((w,i)=>{v.updateWheelTransform(i);return {position:{...w.worldTransform.position},quaternion:{...w.worldTransform.quaternion}};});s.compression=v.wheelInfos.map(w=>Math.max(0,1-w.suspensionLength/.55));}
export function resetBike(s,x,z,yaw){const {chassis:b,height}=s.physics;b.position.set(x,height(x,z)+1.2,z);b.quaternion.setFromEuler(0,yaw,0);b.velocity.setZero();b.angularVelocity.setZero();b.force.setZero();b.torque.setZero();s.crashed=false;s.crashTime=0;s.airtime=0;s.throttle=0;s.steer=0;b.wakeUp();sync(s);}
export function stepBike(s,input,dt) {
  const {world,chassis:b,vehicle:v}=s.physics;
  const gas=input.gas&&!s.crashed?1:0,brake=input.brake?1:0;
  s.throttle+=(gas-s.throttle)*Math.min(1,dt*5);
  const boosting=input.boost&&s.boost>0&&gas;
  s.boost=Math.max(0,Math.min(100,s.boost+(boosting?-28:10)*dt));
  const steerTarget=(input.steer ?? ((input.right?1:0)-(input.left?1:0)))*(.32/(1+s.speed*.055));
  s.steer+=(steerTarget-s.steer)*Math.min(1,dt*7);
  v.setSteeringValue(s.crashed?0:s.steer,1);
  // Torque falls with road speed; drag, not a velocity clamp, sets top speed.
  v.applyEngineForce(-s.throttle*(boosting?1100:800)/(1+s.speed/24),0);
  v.setBrake(brake?3:gas?0:.3,0);v.setBrake(brake?5:0,1);
  const f=b.quaternion.vmult(new C.Vec3(0,0,1));
  const right=b.quaternion.vmult(new C.Vec3(1,0,0));
  const contacts=s.contacts;
  s.slip=Math.abs(b.velocity.dot(right));
  b.force.x-=b.velocity.x*s.speed*.55;b.force.z-=b.velocity.z*s.speed*.55;
  if(!s.crashed){
    if(contacts){
      const lean=input.lean ?? ((input.leanBack?1:0)-(input.leanForward?1:0));
      b.torque.vadd(right.scale(-lean*130),b.torque);
      const desiredRoll=Math.max(-.65,Math.min(.65,-s.steer*s.speed*.14));
      const torque=Math.max(-4500,Math.min(4500,(desiredRoll-s.roll)*6500-b.angularVelocity.dot(f)*1300-b.angularVelocity.y*s.speed*105));
      b.torque.vadd(f.scale(torque),b.torque);
    }else{
      // Rider weight shift and wheel reaction torque rotate the bike, not its velocity.
      const pitchControl=(input.lean ?? ((input.leanBack?1:0)-(input.leanForward?1:0)))*.9+(gas-brake)*.25;
      b.torque.vadd(right.scale(-pitchControl*190),b.torque);
      b.torque.vadd(f.scale(((input.right?1:0)-(input.left?1:0))*65),b.torque);
    }
  }
  const previousAir=s.airtime,impact=-b.velocity.y;
  world.step(dt);
  s.contacts=v.wheelInfos.filter(w=>w.isInContact).length;sync(s);
  s.air=s.contacts===0;
  let landed=0;
  if(s.air)s.airtime+=dt;
  else {if(previousAir>.12)landed=previousAir;s.airtime=0;}
  const up=b.quaternion.vmult(new C.Vec3(0,1,0));
  if(!s.crashed&&((world.contacts.some(c=>c.bi===b||c.bj===b)&&up.y<.45)||(landed>.3&&impact>13))){s.crashed=true;s.crashTime=0;}
  if(s.crashed)s.crashTime+=dt;
  return {landed,crashed:s.crashed,boosting};
}
