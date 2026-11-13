import {mcmSqrt} from './math.js';
import {mcmInverseSqrtLookup as mcmInverseSqrt} from './inverse-sqrt.js';
const f=Math.fround;
const scale=(v,s)=>v.map(x=>f(x*s));
// x87 C0 also selects zero for an unordered projection.
const clampProjection=t=>!(t>=0)?0:Math.min(1,f(t));
// Original 0x42c1b0: horizontal line with a directed perpendicular response.
// Contact position is written even on broad-phase miss; D8 also on narrow miss.
export function testMcmHorizontalLinePair(manager,line,body){
 const [ax,ay,az]=line.start,dx=f(line.end[0]-ax),dz=f(line.end[2]-az),[bx,by,bz]=body.worldCenter;
 const t=clampProjection(((bx-ax)*dx+(bz-az)*dz)/(dz*dz+dx*dx));
 const point=[f(t*dx+ax),ay,f(t*dz+az)];manager.contactCC=[point[0],by,point[2]];
 const x=f(point[0]-bx),rawZ=point[2]-bz,z=f(rawZ),rawDistance=rawZ*z+x*x,distance=f(rawDistance);
 if(rawDistance>body.radiusSquared)return false;
 const inverse=mcmInverseSqrt(distance),n=new Float64Array(3);
 // Indexed stores preserve the x87 NaN sign across JIT array specialization.
 n[0]=f(x*inverse);n[2]=f(z*inverse);
 // Typed stores preserve the first NaN during cold and partially warmed execution.
 manager.contactD8=new Float64Array(3);for(let i=0;i<3;i++)manager.contactD8[i]=f(-n[i]);
 const m=body.matrix,e=body.extents;
 const v=[f(((m[1]*n[1]+m[2]*n[2])+m[0]*n[0])*e[0]),f(((m[5]*n[1]+m[4]*n[0])+m[6]*n[2])*e[1]),f(((m[9]*n[1]+m[10]*n[2])+m[8]*n[0])*e[2])];
 const rawSupport=(v[1]*v[1]+v[2]*v[2])+v[0]*v[0],support=f(rawSupport);
 if(!(rawSupport>distance))return false;
 manager.depth=mcmSqrt(f(support-distance));
 const normal=[dz,0,f(-(line.end[0]-ax))],inv=mcmInverseSqrt(f(normal[2]*normal[2]+normal[0]*normal[0]));
 manager.contactE4=scale(normal,inv);manager.contactD8=scale(manager.contactE4,manager.depth);return true;
}
// Original 0x42c5b0: full 3D segment. Both objects' squared radii enter broad phase.
export function testMcmSpatialLinePair(manager,line,body){
 const d=line.end.map((x,i)=>f(x-line.start[i])),r=body.worldCenter.map((x,i)=>x-line.start[i]);
 const t=clampProjection(((r[1]*d[1]+r[0]*d[0])+r[2]*d[2])/((d[1]*d[1]+d[0]*d[0])+d[2]*d[2]));
 const point=d.map((x,i)=>f(t*x+line.start[i]));manager.contactCC=point;
 const delta=point.map((x,i)=>f(x-body.worldCenter[i])),distance=f((delta[1]*delta[1]+delta[2]*delta[2])+delta[0]*delta[0]);
 if(line.radiusSquared+body.radiusSquared<distance)return false;
 const n=scale(delta,f(mcmInverseSqrt(distance)));manager.contactD8=n.map(x=>f(-x));
 const m=body.matrix,v=[0,1,2].map(i=>f(f((m[i*4+2]*n[2]+m[i*4+1]*n[1])+m[i*4]*n[0])*body.extents[i]));
 const rawSupport=((v[1]*v[1]+v[2]*v[2])+v[0]*v[0])+line.radiusSquared,support=f(rawSupport);
 if(!(rawSupport>distance))return false;
 manager.depth=mcmSqrt(f(support-distance));manager.contactD8=scale(manager.contactD8,manager.depth);
 const [x,y,z]=manager.contactD8;manager.contactE4=scale(manager.contactD8,f(mcmInverseSqrt(f((y*y+x*x)+z*z))));return true;
}
