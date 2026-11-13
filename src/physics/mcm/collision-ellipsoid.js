import {mcmSqrt} from './math.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';
const f=Math.fround;
const rotate=(m,[x,y,z])=>[0,1,2].map(i=>f((m[i+8]*z+m[i+4]*y)+m[i]*x));
const transpose=m=>{const r=[...m];for(const [a,b] of [[1,4],[2,8],[6,9]])[r[a],r[b]]=[r[b],r[a]];return r;};
const scale=(v,s)=>v.map(x=>f(x*s));
const length=v=>mcmSqrt(f((v[1]*v[1]+v[2]*v[2])+v[0]*v[0]));
// Original 0x42bab0, type 1/type 1. Positive extents, noncoincident centers.
export function testMcmEllipsoidPair(manager,a,b){
 const raw=b.worldCenter.map((x,i)=>x-a.worldCenter[i]),delta=raw.map(f);
 const distance=f(delta[0]*delta[0]+(raw[2]*raw[2]+raw[1]*raw[1]));
 const radius=a.radius+b.radius;if(radius*radius<distance)return false;
 const direction=scale(delta,f(mcmInverseSqrt(distance)));
 const ma=transpose(a.matrix),mb=transpose(b.matrix);
 let va=[f((direction[1]*ma[4]+direction[2]*ma[8])+direction[0]*ma[0]),f((direction[1]*ma[5]+direction[0]*ma[1])+direction[2]*ma[9]),f((ma[6]*direction[1]+direction[2]*ma[10])+direction[0]*ma[2])];
 let vb=rotate(mb,direction.map(x=>f(-x)));
 const support=(v,e)=>{const [x,y,z]=v.map((x,i)=>x/e[i]);return scale(v,mcmInverseSqrt(f((x*x+y*y)+z*z)));};
 va=support(va,a.extents);vb=support(vb,b.extents);
 const la=length(va),lb=length(vb);if(!((lb+la)*(lb+la)>distance))return false;
 manager.depth=f((lb-mcmSqrt(distance))+la);
 const world=rotate(a.matrix,va),norm=f(mcmInverseSqrt(f((world[2]*world[2]+world[1]*world[1])+world[0]*world[0])));
 manager.otherE4=scale(world,norm);manager.contactE4=manager.otherE4.map(x=>f(-x));manager.contactD8=scale(manager.contactE4,manager.depth);
 const p=vb.map((x,i)=>f(x+b.localCenter[i])),m=b.matrix;
 manager.contactCC=[f(((m[8]*p[2]+m[4]*p[1])+m[0]*p[0])+m[12]),f(((m[9]*p[2]+m[5]*p[1])+m[1]*p[0])+m[13]),f(((m[6]*p[1]+m[2]*p[0])+m[10]*p[2])+m[14])];
 return true;
}
