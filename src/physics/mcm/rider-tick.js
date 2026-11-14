import {beginMcmRiderTick} from './rider-tick-entry.js';
import {advanceMcmInterpolatedAnimation} from './interpolated-animation-advance.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {updateMcmCollisionGrid} from './collision-grid.js';
import {dispatchMcmCollisions} from './collision-dispatch.js';
import {queryMcmRiderTerrain} from './rider-terrain-query.js';
import {mcmSqrtLookup} from './math.js';
const f=Math.fround;

// Separate 0x40e990 actor tick, through the active crash-animation/no-ground-hit
// path. Free-rider integration is an explicit missing dependency, never skipped.
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
   if(queryMcmRiderTerrain({rider:r,points:c.points,bodyNode,terrain:c.terrain,output:c.queryOutput}))throw Error('Rider ground contact requires free-rider integration');
  }
 }
 if(r.field138)throw Error('Free-rider integration is not connected');
 if(o)dispatchMcmCollisions(c.manager,o.owner);
 return 1;
}
