import {floatBits} from './math.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';
import {inverseRotateMcmVector} from './world-transform.js';
import {rotateMcmTransformAtPivot} from './transform.js';

// Original nonzero-state branch 0x4ab99f..0x4abb2b. State zero's separate
// orientation branch is excluded. Contact normals must have a nonzero sum.
export function updateMcmStateOrientation(c){
 const f=Math.fround;
 let matrix=[...c.matrix],scratch540=[...c.scratch540],axis624=[...c.axis624],applied=false;
 if(c.state844&&!c.anyContact){
  if(c.both){
   if((floatBits(c.field90)|0)>=0x3a83126f){
    const sum=c.normal2e8.map((v,i)=>f(v+c.normal300[i]));
    const [x,y,z]=sum,inverse=f(mcmInverseSqrt(f((y*y+z*z)+x*x)));
    scratch540=sum.map(v=>f(v*inverse));
    axis624=inverseRotateMcmVector(matrix,scratch540);
    matrix=rotateMcmTransformAtPivot(matrix,c.pivot,axis624,c.angle74);applied=true;
   }
  }else if(c.front){matrix=rotateMcmTransformAtPivot(matrix,c.pivot,[0,1,0],f(-c.angle28));applied=true;}
 }
 return {matrix,scratch540,axis624,applied,cacheValid:0};
}
