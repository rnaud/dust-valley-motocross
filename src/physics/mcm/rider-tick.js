import {beginMcmRiderTick} from './rider-tick-entry.js';
import {advanceMcmInterpolatedAnimation} from './interpolated-animation-advance.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {updateMcmCollisionGrid} from './collision-grid.js';
import {dispatchMcmCollisions} from './collision-dispatch.js';
import {queryMcmRiderTerrain} from './rider-terrain-query.js';
import {mcmSqrtLookup} from './math.js';
import {compensateMcmRiderGroundTransform} from './rider-ground-transform.js';
import {setMcmWorldMatrix} from './proxy-transform.js';
import {advanceMcmFreeRider} from './free-rider.js';
import {seekMcmAnimation} from './animation-seek.js';
const f=Math.fround;

// Separate 0x40e990 actor tick through active crash animation, ground contact,
// and free-rider integration. Stopped airborne/crash-animation transitions
// remain explicit; settled contact animations seek their final pose.
export function advanceMcmRiderTick(c,dt){
 c.updateChildren(dt);
 if(c.paused)return 1;
 const {rider:r,animation:a,bodyNode,collider:o}=c;
 r.previousPosition=[...r.position];r.position=resolveMcmWorldMatrix(bodyNode).slice(12,15);c.globalDelta=dt;
 r.center=[...a.boundsMin];r.extents=[...a.boundsMax];
 if(o){
  o.extents=r.extents.map(v=>f(v*r.fieldf8));o.localCenter=[...r.center];
  const [x,y,z]=o.extents;o.radius=mcmSqrtLookup(f((z*z+y*y)+x*x));o.radiusSquared=f(o.radius*o.radius);
  o.matrix=[...resolveMcmWorldMatrix(bodyNode)];updateMcmCollisionGrid(o,c.grid,c.gridEnabled);
 }
 beginMcmRiderTick({rider:r,animation:a,selectedRecord:c.selectedRecord});
 if(r.field140){
  if(a.stopped)throw Error('Stopped crash animation requires free-rider integration');
  advanceMcmInterpolatedAnimation(a,dt,c.applyChild);
  r.matrix=[...resolveMcmWorldMatrix(bodyNode)];
  if(o){
   c.manager.pairs[o.owner][c.bikeCollider.owner]=c.manager.pairs[c.bikeCollider.owner][o.owner]=3;
   const [x,y,z]=r.center,m=o.matrix;
   r.matrix.splice(12,3,f(((m[0]*x+m[4]*y)+m[8]*z)+m[12]),f(((m[1]*x+m[5]*y)+m[9]*z)+m[13]),f(((m[2]*x+m[6]*y)+m[10]*z)+m[14]));
   if(queryMcmRiderTerrain({rider:r,points:c.points,bodyNode,terrain:c.terrain,output:c.queryOutput})){
    o.setCallbacks([0x40bb20,0x40bb30]);
    c.manager.pairs[o.owner][c.bikeCollider.owner]=c.manager.pairs[c.bikeCollider.owner][o.owner]=2;
    r.field140=0;r.field138=1;r.field39c=1;
    r.velocity=[...r.alternateVelocity];r.angular=[...r.alternateAngular];
   }
  }
 }
 if(r.field138){
  if(a.stopped&&!r.field144)throw Error('Free-rider integration is not connected: stopped airborne animation');
  if(!r.field39c&&c.damping===undefined)throw Error('Free-rider integration is not connected');
  r.fieldf8=Math.min(1,f(dt*.75+r.fieldf8));
  if(!r.field39c){
   if(a.stopped)seekMcmAnimation(a,c.animationRecord(r.selected[2]),1,c.applyChild);
   else {advanceMcmInterpolatedAnimation(a,dt,c.applyChild);r.center=[...a.boundsMin];r.extents=[...a.boundsMax];}
   advanceMcmFreeRider(c,dt);
  }
  else {
  const previousJoint=[...resolveMcmWorldMatrix(c.points[6])];
  advanceMcmInterpolatedAnimation(a,dt,c.applyChild);
  r.center=[...a.boundsMin];r.extents=[...a.boundsMax];
  const nextJoint=[...resolveMcmWorldMatrix(c.points[6])];
  setMcmWorldMatrix(bodyNode,compensateMcmRiderGroundTransform(previousJoint,nextJoint,resolveMcmWorldMatrix(bodyNode)));
  r.field39c=0;resolveMcmWorldMatrix(c.points[6]);
  r.matrix=[...resolveMcmWorldMatrix(bodyNode)];
  const [x,y,z]=r.center,m=r.matrix;
  m[12]=f(((x*m[0]+m[4]*y)+m[8]*z)+m[12]);
  m[13]=f(((m[9]*z+m[1]*x)+m[5]*y)+m[13]);
  m[14]=f(((m[2]*x+m[6]*y)+m[10]*z)+m[14]);
  o.extents=r.extents.map(v=>f(v*r.fieldf8));o.localCenter=[...r.center];
  const [ex,ey,ez]=o.extents;o.radius=mcmSqrtLookup(f((ez*ez+ey*ey)+ex*ex));o.radiusSquared=f(o.radius*o.radius);
  o.matrix=[...resolveMcmWorldMatrix(bodyNode)];updateMcmCollisionGrid(o,c.grid,c.gridEnabled);
 }
 }
 if(o)dispatchMcmCollisions(c.manager,o.owner);
 return 1;
}
