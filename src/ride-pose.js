import {Vector3,Quaternion,Matrix4} from 'three';
const angleLerp=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
function pose(){return {position:new Vector3(),quaternion:new Quaternion(),wheels:[0,1].map(()=>({position:new Vector3(),quaternion:new Quaternion()})),compression:[0,0],yaw:0,roll:0,steer:0,speed:0};}
function copy(to,from){to.position.copy(from.position);to.quaternion.copy(from.quaternion);for(let i=0;i<2;i++){to.wheels[i].position.copy(from.wheels[i].position);to.wheels[i].quaternion.copy(from.wheels[i].quaternion);to.compression[i]=from.compression[i];}for(const k of ['yaw','roll','steer','speed'])to[k]=from[k];}
const axle=new Vector3(),normal=new Vector3(),rayUp=new Vector3(),contact=new Vector3();
const steeringUp=new Vector3(),steeringForward=new Vector3(),steeringBasis=new Matrix4();
export function steeringRotation(chassisRotation,wheelRotation,target=new Quaternion()){
  axle.set(1,0,0).applyQuaternion(wheelRotation);
  steeringUp.set(0,1,0).applyQuaternion(chassisRotation);
  steeringUp.addScaledVector(axle,-steeringUp.dot(axle)).normalize();
  steeringForward.crossVectors(axle,steeringUp).normalize();
  return target.setFromRotationMatrix(steeringBasis.makeBasis(axle,steeringUp,steeringForward));
}
function capture(to,state){
  to.position.set(state.x,state.y+.5,state.z);to.quaternion.copy(state.quaternion);
  for(let i=0;i<2;i++){
    const wheel=to.wheels[i],source=state.wheelTransforms[i],hit=state.wheelContacts?.[i];
    wheel.position.copy(source.position);wheel.quaternion.copy(source.quaternion);
    if(hit?.normal){
      contact.set(hit.x,hit.y,hit.z);normal.copy(hit.normal).normalize();
      axle.set(1,0,0).applyQuaternion(wheel.quaternion);
      // A banked rounded tire has less vertical reach than a sphere. Place the
      // visible tread on its contact plane; do not leave it floating when leaned.
      const reach=.47*Math.sqrt(Math.max(0,1-axle.dot(normal)**2))+.14;
      // Contact belongs to the start of the physics step; the wheel transform
      // belongs to its end. Correct along the suspension axis, not toward that
      // older point, which pulled a fast-moving wheel backward and sideways.
      rayUp.copy(source.direction ?? {x:0,y:-1,z:0}).negate().normalize();
      const distance=normal.dot(wheel.position.clone().sub(contact));
      wheel.position.addScaledVector(rayUp,(reach-distance)/Math.max(.5,rayUp.dot(normal)));
    }
    to.compression[i]=state.compression[i];
  }
  for(const k of ['yaw','roll','steer','speed'])to[k]=state[k];
}

// Keep every visible part on the same timeline, one fixed physics step behind.
// This is interpolation, not a delayed chase of the physics position.
export class RidePose {
  constructor(state){this.previous=pose();this.current=pose();this.output=pose();this.reset(state);}
  reset(state){capture(this.current,state);copy(this.previous,this.current);copy(this.output,this.current);}
  push(state){copy(this.previous,this.current);capture(this.current,state);}
  sample(alpha){
    const t=Math.max(0,Math.min(1,alpha)),a=this.previous,b=this.current,o=this.output;
    o.position.lerpVectors(a.position,b.position,t);o.quaternion.slerpQuaternions(a.quaternion,b.quaternion,t);
    for(let i=0;i<2;i++){o.wheels[i].position.lerpVectors(a.wheels[i].position,b.wheels[i].position,t);o.wheels[i].quaternion.slerpQuaternions(a.wheels[i].quaternion,b.wheels[i].quaternion,t);o.compression[i]=a.compression[i]+(b.compression[i]-a.compression[i])*t;}
    o.yaw=angleLerp(a.yaw,b.yaw,t);o.roll=angleLerp(a.roll,b.roll,t);
    for(const k of ['steer','speed'])o[k]=a[k]+(b[k]-a[k])*t;
    return o;
  }
}
