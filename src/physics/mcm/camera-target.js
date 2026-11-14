import {mcmInverseSqrt} from './inverse-sqrt.js';
const f=Math.fround;
const normalize=v=>{const scale=mcmInverseSqrt(f((v[1]*v[1]+v[2]*v[2])+v[0]*v[0]));return v.map(x=>f(x*scale));};
const cross=(a,b)=>[f(a[1]*b[2]-a[2]*b[1]),f(a[2]*b[0]-a[0]*b[2]),f(a[0]*b[1]-a[1]*b[0])];
// Original 0x47a3d0 camera target update. Direct3D retained-mode forwarding
// (camera+0x140 != 0) and the setter's global audio listener are not modeled.
// This computes camera fields for the observed immediate-mode renderer.
export function aimMcmCamera(camera,target,ownerCounter){
 const eye=camera.values.slice(0,3),point=Array.from(target,f);
 if(point.every((x,i)=>x===eye[i]))return 0;
 const forward=normalize(point.map((x,i)=>f(x-eye[i])));
 const right=Math.abs(forward[1])===1?[1,0,0]:normalize(cross([0,1,0],forward));
 const up=cross(forward,right);
 camera.values.splice(3,6,...forward,...up);camera.forwardValid=1;camera.upValid=1;camera.refreshCounter=(ownerCounter+1)>>>0;
 return 1;
}
