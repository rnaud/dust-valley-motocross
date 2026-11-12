import {mcmInverseSqrt} from './inverse-sqrt.js';

// Original 0x48a730 / 0x48a840. The caller clamps negative coordinates before
// lookup. Leaf records are 16 bytes: unsigned height at +2, normal at +4.
export function sampleMcmTerrain(root,x,z) {
  if(!Number.isInteger(x)||!Number.isInteger(z)||x<0||z<0)throw new RangeError('Terrain lookup requires nonnegative integer coordinates');
  let node=root;
  while(node?.level) {
    if(!node.children)return {height:0,normal:[0,1,0]};
    const shift=node.level===1?4:8,size=1<<shift,mask=size-1;
    let bx=x>>shift,bz=z>>shift,child;
    if(bx<16&&bz<16)child=node.children[bz*16+bx];
    if(!child){
      if(bx>=16){bx=15;x=size-1;}
      if(bz>=16){bz=15;z=size-1;}
      child=node.children[bz*16+bx];
      if(!child)return {height:0,normal:[0,1,0]};
    }
    x&=mask;z&=mask;node=child;
  }
  if(!node||x>16||z>16)throw new RangeError('Terrain leaf coordinates exceed 17x17 samples');
  const i=z*17+x,height=(node.heights[i]-node.bias)*node.scale+node.bias;
  let normal=[...node.normals[i]];
  if(node.scale!==1) {
    const f=Math.fround,x=f(node.scale*normal[0]),y=normal[1],unroundedZ=node.scale*normal[2],z=f(unroundedZ);
    const inverse=mcmInverseSqrt(f((unroundedZ*z+y*y)+x*x));
    normal=[x,y,z].map(v=>f(v*inverse));
  }
  return {height,normal};
}
