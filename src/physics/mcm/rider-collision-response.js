import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
import {mcmSqrt} from './math.js';
import {mcmInverseSqrtLookup} from './inverse-sqrt.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {updateMcmCollisionGrid} from './collision-grid.js';
const f=Math.fround;
const scale=(v,k)=>v.map(x=>f(mul(x,k)));
const cross=(a,b)=>[f(sub(mul(a[1],b[2]),mul(b[1],a[2]))),f(sub(mul(b[0],a[2]),mul(a[0],b[2]))),f(sub(mul(a[0],b[1]),mul(b[0],a[1])))];
const dot=(a,b)=>add(add(mul(a[0],b[0]),mul(a[1],b[1])),mul(a[2],b[2]));
const lengthSquared=v=>add(add(mul(v[2],v[2]),mul(v[1],v[1])),mul(v[0],v[0]));
const normalize=v=>scale(v,f(mcmInverseSqrtLookup(f(lengthSquared(v)))));
// Original vector helper 0x40f9b0, with its distinct sum order.
const rotate=(m,[x,y,z])=>[f(add(add(mul(m[0],x),mul(m[8],z)),mul(m[4],y))),f(add(add(mul(m[1],x),mul(m[5],y)),mul(m[9],z))),f(add(add(mul(m[6],y),mul(m[10],z)),mul(m[2],x)))];
// Original 0x40bf70. No effect emission is requested by crash callback 0x40e420.
export function applyMcmRiderContactImpulse(r,contact,normal,correction,otherVelocity,coefficients,zero=[0,0,0],force=0){
 const [bounce,friction,alignment,mass,angularFriction]=coefficients,m=r.matrix;
 const inverse=m.slice();for(const [a,b] of [[1,4],[2,8],[6,9]])[inverse[a],inverse[b]]=[inverse[b],inverse[a]];
 const lever=rotate(inverse,contact.map((x,i)=>f(sub(x,m[12+i])))),n=rotate(inverse,normal);
 const projection=r.velocity.every((x,i)=>x===zero[i])?zero:scale(r.velocity,f(div(f(dot(otherVelocity,r.velocity)),dot(r.velocity,r.velocity))));
 const relative=rotate(inverse,r.velocity.map((x,i)=>f(sub(x,projection[i]))));
 const tangent=scale(cross(cross(n,relative),n),friction);
 const frictionAngular=scale(cross(lever,relative),angularFriction),speed=f(mcmSqrt(f(lengthSquared(r.angular))));
 const rotationMotion=cross(r.angular,lever);
 let angular;
 if(dot(n,rotationMotion)<0){const opposite=cross(lever,rotationMotion.map(x=>-x));angular=speed===0?[0,0,0]:scale(scale(normalize(opposite),bounce),speed);}
 else {const scaled=scale(r.angular,bounce);angular=speed===0?[0,0,0]:r.angular.map((x,i)=>f(add(scaled[i],x)));}
 angular=angular.map((x,i)=>f(add(x,frictionAngular[i])));
 const componentDirection=normalize(n.map((x,i)=>f(mul(x,lever[i]))));
 let align=[0,0,0];
 if(!componentDirection.every((x,i)=>x===-n[i])){
  const axis=normalize(cross(lever,n)),base=scale(axis,alignment),forceScale=f(mul(force,f(.1)));
  align=scale(scale(base,forceScale),f(mul(componentDirection[1],componentDirection[1])));
 }
 r.angular=angular.map((x,i)=>f(add(x,align[i])));
 const change=scale(relative,f(-add(bounce,1))),numerator=f(dot(n,change));
 const inverseMass=div(1,mass),denominator=dot(n,scale(n,inverseMass));
 const impulse=scale(n,mul(div(numerator,denominator),inverseMass));
 for(let i=0;i<3;i++)m[12+i]=f(add(correction[i],m[12+i]));
 const worldChange=rotate(m,impulse.map((x,i)=>f(sub(x,tangent[i]))));
 r.velocity=r.velocity.map((x,i)=>f(add(x,worldChange[i])));
}
// Original 0x40e420. Update the proxy, collider bounds and live grid after impulse.
export function respondMcmRiderCrashContact({rider:r,collision:c,proxy,grid,gridEnabled,coefficients,zero,otherVelocity}){
 applyMcmRiderContactImpulse(r,c.contactCC,c.contactE4,c.contactD8,c.other.collisionClass===0?otherVelocity:zero,coefficients,zero);
 const [x,y,z]=r.center.map(v=>-v),m=r.matrix;
 const position=[f(add(add(add(mul(m[0],x),mul(m[8],z)),mul(m[4],y)),m[12])),f(add(add(add(mul(m[1],x),mul(m[5],y)),mul(m[9],z)),m[13])),f(add(add(add(mul(m[2],x),mul(m[6],y)),mul(m[10],z)),m[14]))];
 proxy.local=m.slice();invalidateMcmTransform(proxy);for(let i=0;i<3;i++)proxy.local[12+i]=position[i];invalidateMcmTransform(proxy);
 c.extents=scale(r.extents,r.extentScale);c.localCenter=[...r.center];c.radius=f(mcmSqrt(f(dot(c.extents,c.extents))));c.radiusSquared=f(mul(c.radius,c.radius));
 c.matrix=[...resolveMcmWorldMatrix(proxy)];updateMcmCollisionGrid(c,grid,gridEnabled);
 if(r.contactClass!==3)r.contactClass=c.other.collisionClass;
}
// Original 0x40e650.
export function respondMcmRiderSecondary(rider,collision){if(rider.contactClass!==3)rider.contactClass=collision.other.collisionClass;}
