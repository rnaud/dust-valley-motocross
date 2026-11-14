import {mcmSqrtLookup,floatBits} from './math.js';
import {mcmInverseSqrtLookup} from './inverse-sqrt.js';
import {mcmAxisAngleMatrix} from './axis-angle.js';
import {multiplyMcmMatrices} from './matrix.js';
import {queryMcmRiderTerrain} from './rider-terrain-query.js';
import {applyMcmRiderContactImpulse} from './rider-collision-response.js';
import {startMcmAnimation} from './animation-seek.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {updateMcmCollisionGrid} from './collision-grid.js';
const f=Math.fround;
const nearestEven=x=>{const lo=Math.floor(x),p=x-lo;return p<.5?lo:p>.5?lo+1:lo%2===0?lo:lo+1;};
// Original 0x430a60 retains the previous displayed/blend frames across start.
export function blendMcmRiderAnimation(a,record,duration){
 startMcmAnimation(a,record);
 if(a.displayedFrame&&Math.abs(duration)!==0&&a.blendFrame){a.blendTime=a.remainder;a.blendDuration=duration;a.blending=1;}
}
// Original 0x40cd60. The final remainder is computed before the 80-step cap.
export function advanceMcmFreeRider(c,dt){
 const {rider:r,bodyNode,collider:o,animation:a}=c;
 if(c.damping===undefined)throw Error('Free-rider integration is not connected: missing captured damping');
 let count=nearestEven(f(dt*80-.5));const remainder=f(count*f(-.0125)+dt);count=Math.min(count,80);r.field14c=0;
 for(let i=0;i<=count;i++){
  const step=i===count?remainder:f(.0125);if((floatBits(step)|0)<=0)continue;
  r.velocity[1]=f(step*f(-32.2)+r.velocity[1]);
  r.velocity[0]=f((1-c.damping*step)*r.velocity[0]);r.velocity[2]=f(f(1-c.damping*step)*r.velocity[2]);
  for(let j=0;j<3;j++)r.matrix[12+j]=f(r.velocity[j]*step+r.matrix[12+j]);
  const [x,y,z]=r.angular,inverse=mcmInverseSqrtLookup(f((x*x+y*y)+z*z)),axis=r.angular.map(v=>f(v*inverse));
  let speed=mcmSqrtLookup(f((y*y+z*z)+x*x));
  if(speed>Math.PI){r.angular=axis.map(v=>f(v*f(Math.PI)));speed=f(Math.PI);}
  if(Math.abs(speed)!==0){const position=r.matrix.slice(12,15);r.matrix=multiplyMcmMatrices(r.matrix,mcmAxisAngleMatrix(axis,speed*step));r.matrix.splice(12,3,...position);}
  if(queryMcmRiderTerrain({rider:r,points:c.points,bodyNode,terrain:c.terrain,output:c.queryOutput})){
   r.field14c=1;
   if(!r.field144){
    r.field144=1;r.field154=3;
    const [vx,vy,vz]=r.velocity,index=r.region*2+(mcmSqrtLookup(f((vy*vy+vz*vz)+vx*vx))<3?1:0);
    const record=c.contactRecord(index);r.selected[2]=record.token;blendMcmRiderAnimation(a,record,1);
   }else r.field154=3;
   const q=c.queryOutput;
   applyMcmRiderContactImpulse(r,q.point,q.normal,q.penetration,c.response.zero,c.response.coefficients,c.response.zero,step);
   c.contactEffects(q.point);
  }
  const [nx,ny,nz]=r.center.map(v=>-v),m=r.matrix;
  const position=[f(((m[0]*nx+nz*m[8])+m[4]*ny)+m[12]),f(((m[1]*nx+m[5]*ny)+m[9]*nz)+m[13]),f(((m[2]*nx+m[6]*ny)+m[10]*nz)+m[14])];
  bodyNode.local=[...m];invalidateMcmTransform(bodyNode);bodyNode.local.splice(12,3,...position);invalidateMcmTransform(bodyNode);
  if(o){o.extents=r.extents.map(v=>f(v*r.fieldf8));o.localCenter=[...r.center];const [ex,ey,ez]=o.extents;o.radius=mcmSqrtLookup(f((ez*ez+ey*ey)+ex*ex));o.radiusSquared=f(o.radius*o.radius);o.matrix=[...resolveMcmWorldMatrix(bodyNode)];updateMcmCollisionGrid(o,c.grid,c.gridEnabled);}
 }
 if(!r.field14c)r.field148=0;else if(!r.field148){r.field148=1;r.field14c=1;}else r.field14c=0;
}
