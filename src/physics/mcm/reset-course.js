import {bitsFloat,floatBits,mcmSqrt} from './math.js';
import {queryMcmTerrainFaceNormal} from './terrain-face-normal.js';
const f=Math.fround;

// Original 0x4adb10: move a reset pose away from nearby bikes, then apply
// mode-3 course limits. The iterable preserves original bike enumeration order.
export function adjustMcmResetCourse(c,position,forward){
 const b=c.bike;
 if(forward&&!(c.playerCount===1&&c.aiCount===0)){
  b.position=[...position];
  if(forward[0]===0&&forward[2]===0)forward.splice(0,3,0,0,1);
  let previous=null;
  while(true){
   let nearest=null,best=bitsFloat(0x7f7fffff);
   for(const other of c.enumerationDisabled?[]:c.bikes){
    if(other===b||other.fieldc30)continue;
    const dx=f(other.position[0]-b.position[0]),rawZ=other.position[2]-b.position[2],dz=f(rawZ);
    const squared=rawZ*dz+dx*dx;
    if(squared<best){best=f(squared);nearest=other;}
   }
   const distance=mcmSqrt(best),limit=b.field88c?1.5:4;
   if(!nearest||!(limit>distance))break;
   if(previous!==nearest){
    position[0]=f(position[0]+forward[2]*f(3.6));
    position[2]=f(position[2]+forward[0]*f(3.6));
   }else{
    position[0]=f(position[0]+forward[0]*f(-3.7));
    position[2]=f(position[2]+forward[2]*f(-3.7));
   }
   previous=nearest;b.position=[...position];
  }
 }
 if(c.mode!==3)return;
 for(const axis of [0,2]){
  const low=c.width*f(1.2333),high=c.width*f(254.76);
  if(low>b.position[axis])position[axis]=f(low);
  else if(high<b.position[axis])position[axis]=f(high);
  if(c.width*10>position[axis]){
   const n=queryMcmTerrainFaceNormal({...c.terrain,point:[...position],normal:[0,0,0]});
   if((floatBits(n[1])|0)<0x3f34fdf4)position[axis]=f(c.width*10+position[axis]);
  }else if(c.width*246<position[axis]){
   const n=queryMcmTerrainFaceNormal({...c.terrain,point:[...position],normal:[0,0,0]});
   if((floatBits(n[1])|0)<0x3f34fdf4)position[axis]=f(position[axis]-c.width*10);
  }
 }
 if(forward&&c.setting===0&&!b.fieldbb8)forward.splice(0,3,...b.spawnPosition.map((v,i)=>f(v-position[i])));
}
