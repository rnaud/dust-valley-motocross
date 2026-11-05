import {RaycastVehicle,Vec3} from 'cannon-es';

// Cannon's standard ray stops at spring rest length, despite exposing additional
// suspension travel. Probe the whole stroke so the wheels can follow a falling
// surface and extend when airborne. Spring/damper forces remain Cannon's.
export class BikeVehicle extends RaycastVehicle {
  castRay(wheel){
    this.updateWheelTransformWorld(wheel);
    const min=wheel.suspensionRestLength-wheel.maxSuspensionTravel;
    const max=wheel.suspensionRestLength+wheel.maxSuspensionTravel;
    const source=wheel.chassisConnectionPointWorld;
    const target=source.vadd(wheel.directionWorld.scale(max+wheel.radius));
    const hit=wheel.raycastResult,b=this.chassisBody;
    hit.reset();
    const response=b.collisionResponse;b.collisionResponse=false;
    try{
      this.world.rayTest(source,target,hit);
      // At an exact heightfield seam a nearly vertical ray can numerically miss
      // both triangles. A sub-millimetre probe prevents a false airborne frame.
      if(!hit.hasHit)for(const offset of [.0001,-.0001]){
        const shift=new Vec3(offset,0,offset);
        this.world.rayTest(source.vadd(shift),target.vadd(shift),hit);
        if(hit.hasHit)break;
      }
    }finally{b.collisionResponse=response;}
    hit.groundObject=0;
    if(hit.body){
      wheel.isInContact=true;
      wheel.suspensionLength=Math.max(min,Math.min(max,hit.distance-wheel.radius));
      const denominator=hit.hitNormalWorld.dot(wheel.directionWorld);
      const velocity=new Vec3();b.getVelocityAtWorldPoint(hit.hitPointWorld,velocity);
      wheel.clippedInvContactDotSuspension=denominator>=-.1?10:-1/denominator;
      wheel.suspensionRelativeVelocity=denominator>=-.1?0:hit.hitNormalWorld.dot(velocity)*wheel.clippedInvContactDotSuspension;
      return hit.distance;
    }
    wheel.isInContact=false;
    wheel.suspensionLength=max;
    wheel.suspensionRelativeVelocity=0;
    wheel.directionWorld.scale(-1,hit.hitNormalWorld);
    wheel.clippedInvContactDotSuspension=1;
    return -1;
  }
}
