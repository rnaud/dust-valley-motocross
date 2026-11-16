import {applyMcmRiderContactImpulse} from './rider-collision-response.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {updateMcmCollisionGrid} from './collision-grid.js';
import {mcmSqrt} from './math.js';
const f=Math.fround;
import {respondMcmCollision} from './collision-callback.js';
import {mcmSubtract as sub,mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
// Original 0x40ba00. This is the restored upright rider's secondary callback,
// distinct from crash callback 0x40bb30. It can latch another bike or transfer tag.
export function secondaryMcmNormalRiderCollision(c){
 const {bike,other,collisionType,tag}=c;
 if(collisionType!==0||bike.field8ac||other.field8ac||bike===other)return;
 if(tag){
  if(tag.player!==bike)return;
  if(tag.holder===bike){
   if(!c.resetTag||!c.notifyTag)throw Error('Rider tag transfer requires reset and notification adapters');
   // Original resets before storing the new holder (unlike bike primary).
   c.resetTag();tag.holder=other;c.notifyTag(bike,other,0);
   bike.field888=other.field888=5;bike.field8ac=other.field8ac=1;return;
  }
  if(tag.holder===other){
   if(!c.notifyTag)throw Error('Rider tag contact requires notification adapter');
   c.notifyTag(bike,bike,1);return;
  }
 }
 if(sub(other.position[1],bike.position[1])>3)bike.field8b0=other.address;
}

// Original 0x40b9e0 -> 0x40e020, including the active-animation contact transition.
export function primaryMcmNormalRiderCollision(c){
 const {rider,bike,collisionType}=c;
 if(collisionType===1)return;
 if(rider.flag140)transitionMcmNormalRiderContact(c);
 else if(collisionType===2&&!bike.state844)(c.respond||respondMcmCollision)(c);
 if(rider.contactClass!==3)rider.contactClass=collisionType;
}

export function transitionMcmNormalRiderContact(c){
 const {rider:r,bike,collision:o,proxy,manager,coefficients,zero}=c;
 if(!manager||!coefficients||!zero)throw Error('Missing active rider collision dependencies');
 manager.pairs[o.owner][bike.collision.owner]=manager.pairs[bike.collision.owner][o.owner]=2;
 r.flag140=0;r.field138=1;r.matrix=[...resolveMcmWorldMatrix(proxy)];
 const [x,y,z]=r.center,m=o.matrix;
 r.matrix[12]=f(add(add(add(mul(m[4],y),mul(m[8],z)),mul(m[0],x)),m[12]));
 r.matrix[13]=f(add(add(add(mul(m[1],x),mul(m[5],y)),mul(m[9],z)),m[13]));
 r.matrix[14]=f(add(add(add(mul(m[10],z),mul(m[2],x)),mul(m[6],y)),m[14]));
 r.velocity=[...r.alternateVelocity];r.angular=[...r.alternateAngular];
 // 40e1c4 adds correction before 40bf70, which adds it again.
 for(let i=0;i<3;i++)r.matrix[12+i]=f(add(o.contactD8[i],r.matrix[12+i]));
 applyMcmRiderContactImpulse(r,o.contactCC,o.contactE4,o.contactD8,c.collisionType===0?c.other.velocity:zero,coefficients,zero);
 const a=r.matrix,nx=-x,ny=-y,nz=-z;
 const position=[f(add(add(add(mul(a[8],nz),mul(a[4],ny)),mul(a[0],nx)),a[12])),f(add(add(add(mul(a[9],nz),mul(a[5],ny)),mul(a[1],nx)),a[13])),f(add(add(add(mul(a[2],nx),mul(a[10],nz)),mul(a[6],ny)),a[14]))];
 proxy.local=a.slice();invalidateMcmTransform(proxy);for(let i=0;i<3;i++)proxy.local[12+i]=position[i];invalidateMcmTransform(proxy);
 o.extents=r.extents.map(v=>f(mul(v,r.extentScale)));o.localCenter=[...r.center];
 const [ex,ey,ez]=o.extents;o.radius=f(mcmSqrt(f(add(add(mul(ex,ex),mul(ey,ey)),mul(ez,ez)))));o.radiusSquared=f(mul(o.radius,o.radius));
 o.matrix=[...resolveMcmWorldMatrix(proxy)];(c.updateGrid||updateMcmCollisionGrid)(o,c.grid,c.gridEnabled);
}
