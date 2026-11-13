import {queryMcmTerrainHeight} from './terrain-height.js';
import {queryMcmTerrainFaceNormal} from './terrain-face-normal.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';
import {adjustMcmResetCourse,avoidMcmResetBikes} from './reset-course.js';
const f=Math.fround;
const normalize=v=>{
 const [x,y,z]=v,squared=(y*y+z*z)+x*x;
 if(squared===0)return [0,0,0];
 const inverse=mcmInverseSqrt(f(squared));return v.map(n=>f(n*inverse));
};

// Original 0x4ae0b0: compare five terrain supports, choose a pose and heading,
// then execute the mode-specific nearby-bike/course adjustment.
export function selectMcmResetTerrain(c,position,forward){
 const b=c.bike;
 const samples=[[0,0,0],[0,0,10],[0,0,-10],[10,0,0],[-10,0,0]].map(offset=>{
  const point=b.position.map((v,i)=>f(v+offset[i]));
  return {point:queryMcmTerrainHeight({...c.terrain,point}),normal:queryMcmTerrainFaceNormal({...c.terrain,point,normal:[0,0,0]})};
 });
 let best=samples[1].normal[1]<samples[0].normal[1]?0:1;
 const other=1-best;
 let secondary=best,secondaryPoint=null;
 if(samples[best].normal[1]>samples[other].point[1]){secondary=other;secondaryPoint=samples[other].point;}
 for(let i=2;i<5;i++){
  if(samples[best].normal[1]<samples[i].normal[1]){
   secondary=best;secondaryPoint=samples[best].point;best=i;
  }else if(samples[secondary].normal[1]<samples[i].normal[1]&&samples[best].normal[1]>samples[i].point[1]){
   secondary=i;secondaryPoint=samples[i].point;
  }
 }
 const support=samples[best].point;position.splice(0,3,...support);
 if(c.mode===1){
  if(c.targetNode){
   const target=c.targetNode.local.slice(12,15);
   forward.splice(0,3,...normalize(target.map((v,i)=>f(v-support[i]))));
  }
  adjustMcmResetCourse(c,position,forward);
 }else if((c.mode===0||c.mode===2||c.mode===4)&&forward){
  if(secondaryPoint){
   b.offset=secondaryPoint.map((v,i)=>f(v-support[i]));b.offset[1]=0;
   const dot=b.savedHeading[0]*b.offset[0]+b.savedHeading[2]*b.offset[2];
   const heading=dot<0?[-b.offset[0],0,-b.offset[2]]:[...b.offset];
   forward.splice(0,3,...normalize(heading));
  }else forward.splice(0,3,...b.savedHeading);
  avoidMcmResetBikes(c,position,forward);
 }
}
