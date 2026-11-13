import {calculateMcmDriveForce} from './drive-force.js';
import {updateMcmFrontVelocitySubstep} from './front-velocity-substep.js';
import {updateMcmRotatingResponse} from './rotating-response.js';
import {invalidateMcmTransform} from './event-orientation.js';

// Original rear-only entry 0x4a7ad6 and rear response 0x4a7b27..0x4a7c46.
export function updateMcmRearSuspension(c){
 if(!c.anyContact)return;
 if(!c.frontContact){
  const s=c.frontSuspension;
  s.active=0;s.previousDisplacement=[0,0,0];s.previousTravel=0;
  c.frontMotion.speed=0;s.compression=0;s.contactLimited=+(c.state844===2);
 }
 if(!c.rearContact)return;
 const s=c.rearSuspension,node=c.rearMountNode;
 const r=updateMcmRotatingResponse({...s,dt:c.dt,height:c.heights[1],point:c.points[7],
  a:c.points[9],b:c.rearLever,normal:c.points[5],velocity:c.velocity,
  anyContact:c.control2c,state:c.state844,matrix:node.local,cacheValid:node.cacheValid});
 c.heights[1]=r.height;c.points[7]=r.point;
 for(const key of ['displacement','compression','travel','previousTravel','limited','contactLimited','active'])s[key]=r[key];
 s.suspensionVelocity=r.velocity;
 if(r.rotationApplied){node.local=r.matrix;invalidateMcmTransform(node);}
}
// Original rear-contact drive-force call at 0x4a7c46..0x4a7c6c.
export function prepareMcmRearDrive(c){
 if(!c.anyContact || !c.rearContact)return;
 const r=calculateMcmDriveForce({...c.drive,speed:c.speed,direction:c.rearTangent,forceScale:Math.fround(341.62)});
 c.driveScalar=r.scalar;c.frontLoad.scratch354=r.vector;
}
export function updateMcmRearSuspensionSubstep(c){
 const result=updateMcmFrontVelocitySubstep(c);updateMcmRearSuspension(c);prepareMcmRearDrive(c);return result;
}
