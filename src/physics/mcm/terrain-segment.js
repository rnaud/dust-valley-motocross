import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';

const f=Math.fround,positive=x=>(floatBits(x)|0)>0,negative=x=>floatBits(x)>0x80000000;

// 0x412490 / 0x412520. Direction gates are integer comparisons of float bits;
// the plane comparisons retain the original FCOM unordered behavior.
function clipPlane(point,direction,axis,boundary){
 if(!((positive(direction[axis])&&!(point[axis]>=boundary))||
      (negative(direction[axis])&&point[axis]>boundary)))return;
 const t=div(sub(boundary,point[axis]),direction[axis]);
 for(let i=0;i<3;i++)if(i!==axis)point[i]=f(add(mul(direction[i],t),point[i]));
 point[axis]=boundary;
}

// Original terrain wrapper 0x410ac0. traverse is the separate 0x48e4c0 node
// routine, and is mandatory when clipping reaches the root. No miss fallback
// stands in for that routine. Coordinates passed to it are x,z,height.
export function queryMcmTerrainSegment(terrain,start,end,output,option,traverse){
 const scale=mul(terrain.heightScale,256),inverse=div(1,scale);
 const a=Array.from(start,x=>f(mul(x,inverse))),b=Array.from(end,x=>f(mul(x,inverse)));
 const direction=b.map((x,i)=>f(sub(x,a[i]))),reverse=direction.map(x=>-x);
 const root=terrain.root,extent=f(16<<((root.shift-8)&31));
 const low=f(mul(root.minimumHeight|0,1/256)),high=f(mul(root.maximumHeight|0,1/256));
 // The x-plane code is inlined in the original and tests zero by float bits.
 const clipX=(point,d,boundary)=>{
  const outside=boundary===0
   ?(positive(d[0])&&negative(point[0]))||(negative(d[0])&&positive(point[0]))
   :(positive(d[0])&&boundary>point[0])||(negative(d[0])&&!(boundary>=point[0]));
  if(!outside)return;
  const t=div(boundary===0?-point[0]:sub(boundary,point[0]),d[0]);
  point[0]=boundary;
  point[1]=f(add(mul(d[1],t),point[1]));
  point[2]=f(add(mul(t,d[2]),point[2]));
 };
 if(positive(direction[0]))clipX(a,direction,0);
 else if(negative(direction[0]))clipX(a,direction,extent);
 if(negative(direction[0]))clipX(b,reverse,0);
 else if(positive(direction[0]))clipX(b,reverse,extent);
 if(positive(direction[2]))clipPlane(a,direction,2,0);
 else if(negative(direction[2]))clipPlane(a,direction,2,extent);
 if(negative(direction[2]))clipPlane(b,reverse,2,0);
 else if(positive(direction[2]))clipPlane(b,reverse,2,extent);
 if(positive(direction[1]))clipPlane(a,direction,1,low);
 else if(negative(direction[1]))clipPlane(a,direction,1,high);
 if(negative(direction[1]))clipPlane(b,reverse,1,low);
 else if(positive(direction[1]))clipPlane(b,reverse,1,high);
 if(!(positive(a[0])||positive(b[0]))||!(extent>a[0]||extent>b[0])||
    !(positive(a[2])||positive(b[2]))||!(extent>a[2]||extent>b[2])||
    !(!(low>=a[1])||!(low>=b[1]))||!(high>a[1]||high>b[1]))return 0;
 if(typeof traverse!=='function')throw new Error('Unmapped terrain segment traversal 0x48e4c0');
 const hit=traverse(root,[a[0],a[2],a[1]],[b[0],b[2],b[1]],output,option);
 if(!hit)return 0;
 const y=output[1];
 output[0]=f(mul(output[0],scale));output[1]=f(mul(output[2],scale));output[2]=f(mul(scale,y));
 return 1;
}
