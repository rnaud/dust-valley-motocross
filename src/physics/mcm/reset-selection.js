import {mcmInverseSqrt} from './inverse-sqrt.js';
const f=Math.fround;

// Original 0x4a5eb4..0x4a62eb, entered with a nonzero reset reason.
// Terrain (0x4ae0b0) and course (0x4adb10) helpers mutate the supplied vectors.
// Initial vectors are caller scratch: the original vector constructor is a no-op.
export function selectMcmResetPose(c){
 const b=c.bike,pose=c.pose,mode=(c.mode<<16)>>16;
 if(mode===0||mode===1||mode===4){
  c.selectTerrain(pose.position,pose.forward);return pose;
 }
 if(mode!==2&&mode!==3){
  pose.position=[...b.position];pose.forward=[...b.forward];return pose;
 }
 const useSpawn=c.setting!==0||b.fieldbb8!==0||c.resetReason===2||(mode===2&&b.field614!==0);
 if(useSpawn){
  pose.position=[...b.spawnPosition];pose.forward=[...b.spawnForward];
  if(mode===2)b.position=[...pose.position];
 }else{
  pose.position=[...b.position];
  const target=[...b.spawnPosition];target[1]=0;
  const delta=target.map((v,i)=>f(v-pose.position[i]));
  const [x,y,z]=delta,squared=(y*y+z*z)+x*x;
  if(squared===0)pose.forward=[0,0,0];
  else{const inverse=mcmInverseSqrt(f(squared));pose.forward=delta.map(v=>f(v*inverse));}
 }
 if(mode===2){
  if(b.fieldc08||b.fieldbe4)c.selectTerrain(pose.position,null);
 }else c.selectCourse(pose.position,pose.forward);
 return pose;
}
