import {floatBits} from './math.js';
import {mcmInverseSqrtLookup} from './inverse-sqrt.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround,positive=x=>(floatBits(x)|0)>0,negative=x=>floatBits(x)>0x80000000;
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
const nearestEven=x=>{const a=Math.floor(x),r=x-a;return r<.5?a:r>.5?a+1:a%2===0?a:a+1;};

// Original plane construction 0x401820 and line/plane intersection 0x401970.
export function intersectMcmTrianglePlane(start,end,a,b,c){
 const u=b.map((v,i)=>f(sub(v,a[i]))),v=c.map((v,i)=>f(sub(v,a[i])));
 let n=[f(sub(mul(u[1],v[2]),mul(u[2],v[1]))),f(sub(mul(u[2],v[0]),mul(u[0],v[2]))),f(sub(mul(u[0],v[1]),mul(u[1],v[0])))];
 const squared=add(add(mul(n[0],n[0]),mul(n[1],n[1])),mul(n[2],n[2]));
 const length=squared===0||Number.isNaN(squared)?0:f(div(1,mcmInverseSqrtLookup(f(squared))));
 if(floatBits(length)&0x7fffffff){const inverse=div(1,length);n=n.map(x=>f(mul(x,inverse)));}
 const d=f(-add(add(mul(n[0],a[0]),mul(n[1],a[1])),mul(n[2],a[2])));
 const direction=end.map((x,i)=>f(sub(x,start[i])));
 const numerator=add(add(add(mul(start[1],n[1]),mul(start[0],n[0])),mul(start[2],n[2])),d);
 const denominator=add(add(mul(direction[0],n[0]),mul(direction[1],n[1])),mul(direction[2],n[2]));
 const t=-div(numerator,denominator);
 return direction.map((x,i)=>f(add(mul(x,t),start[i])));
}

// 0x48e4c0 builds separate x/y grid crossings before merging them. Repeated
// float stores and its coordinate-based duplicate checks affect hit selection.
export function splitMcmTerrainSegment(start,end,shift){
 const direction=end.map((x,i)=>f(sub(x,start[i]))),step=f(1<<((shift-8)&31));
 function crossings(axis){
  const points=[];if(!(floatBits(direction[axis])&0x7fffffff))return points;
  const other=1-axis,increment=negative(direction[axis])?-step:step;
  const slope=f(div(direction[other],direction[axis])),heightSlope=f(div(direction[2],direction[axis]));
  let at=f(mul(Math.trunc(div(start[axis],increment)),increment));
  if(negative(increment))at=f(sub(at,increment));
  const delta=f(mul(slope,increment)),heightDelta=f(mul(heightSlope,increment));
  let along=start[other],height=start[2];
  const within=()=>positive(direction[axis])?at<=end[axis]:end[axis]<=at;
  const save=()=>{const p=[];p[axis]=at;p[other]=along;p[2]=height;points.push(p);};
  if(start[axis]===at)save();
  else{
   at=f(add(at,increment));
   if(within()){
    along=f(add(mul(slope,sub(at,start[axis])),along));
    height=f(add(mul(sub(at,start[axis]),heightSlope),height));save();
   }
  }
  at=f(add(at,increment));
  while(within()){
   if(points.length>=17)throw new RangeError('Terrain segment exceeds original crossing array');
   along=f(add(along,delta));height=f(add(height,heightDelta));save();at=f(add(at,increment));
  }
  return points;
 }
 const x=crossings(0),y=crossings(1),zero=[0,0,0],merged=Array.from({length:35},()=>[0,0,0]);
 let count=x.length+y.length,i=0,j=0,k=0;
 if(!same(start,x[0]??zero)&&!same(start,y[0]??zero)){merged[1]=[...start];count++;k=1;}
 if(!(floatBits(direction[0])&0x7fffffff)){for(;k<count;k++)merged[k+1]=[...y[j++]];}
 else for(;k<count;k++){
  if(i<x.length&&j<y.length){
   const chooseX=positive(direction[0])?y[j][0]>x[i][0]:negative(direction[0])&&y[j][0]<x[i][0];
   if(chooseX){merged[k+1]=[...x[i++]];if(merged[k+1][0]===y[j][0]||merged[k+1][1]===y[j][1]){j++;count--;}}
   else{merged[k+1]=[...y[j++]];if(x[i][0]===merged[k+1][0]||x[i][1]===merged[k+1][1]){i++;count--;}}
  }else{
   const p=i<x.length?x[i++]:y[j++];
   if(k===0||!same(p,merged[k]))merged[k+1]=[...p];else count--;
  }
 }
 if(!same(merged[count],end))merged[++count]=[...end];
 return {points:merged.slice(1,count+1),direction,step};
}

// Original recursive traversal 0x48e4c0; option models its optional node output.
export function traverseMcmTerrainSegment(node,start,end,output,option){
 const {points,direction,step}=splitMcmTerrainSegment(start,end,node.shift),twice=f(step*2);
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1];
  let x=nearestEven(f((b[0]+a[0])/twice-.5)),y=nearestEven(f(f((b[1]+a[1])/twice)-.5));
  if(node.level){
   if(x===16)x=15;if(y===16)y=15;
   if(x<0||y<0||x>15||y>15)throw new RangeError('Terrain child query outside grid');
   const child=node.children[y*16+x];if(!child)continue;
   const low=f(child.minimumHeight/256),high=f(child.maximumHeight/256);
   if(!(low<=a[2]||low<=b[2])||!(a[2]<=high||b[2]<=high))continue;
   const local=p=>[f(p[0]-x*step),f(p[1]-y*step),p[2]];
   if(traverseMcmTerrainSegment(child,local(a),local(b),output,option))return 1;
   continue;
  }
  if(x<0||y<0||x>16||y>16)throw new RangeError('Terrain leaf query outside recorded row table');
  // Boundary rounding can select x/y=16. The original does not clamp and can
  // read adjacent allocation bytes. Such reads require observed memory, never
  // a fabricated zero or a wrapped terrain coordinate.
  const readHeight=index=>{
   const value=index<node.heights.length?node.heights[index]:node.readHeight?.(index);
   if(!Number.isInteger(value)||value<0||value>65535)throw new Error(`Unmapped terrain height read: node ${node.offset}, sample ${index}`);
   return value;
  };
  const bias=f(node.bias/256),height=(dx,dy)=>f(((readHeight((y+dy)*17+x+dx)-node.bias)*node.scale)/256+bias);
  const h00=height(0,0),h10=height(1,0),h01=height(0,1),h11=height(1,1);
  const low=Math.min(h00,h10,h01,h11),high=Math.max(h00,h10,h01,h11);
  if(!(low<=a[2]||low<=b[2])||!(a[2]<=high||b[2]<=high))continue;
  const x1=f(x+1),y1=f(y+1),p00=[x,y,h00],p10=[x1,y,h10],p01=[x,y1,h01],p11=[x1,y1,h11],odd=(x^y)&1;
  const triangles=odd?[[p00,p10,p01],[p10,p11,p01]]:[[p00,p10,p11],[p00,p11,p01]];
  for(let triangle=0;triangle<2;triangle++){
   const hit=intersectMcmTrianglePlane(a,b,...triangles[triangle]),[hx,hy]=hit;
   if(!(hx<=x1&&hy<=y1&&(triangle?x<hx&&y<hy:x<=hx&&y<=hy)))continue;
   const distance=(px,py)=>(hx-px)*(hx-px)+(hy-py)*(hy-py);
   const d0=odd?distance(x,y):distance(x1,y),d1=odd?distance(x1,y1):distance(x,y1);
   if(!(triangle?d1<d0:d0<=d1))continue;
   if((negative(direction[0])&&hit[0]<b[0])||(positive(direction[0])&&b[0]<hit[0])||
      (negative(direction[1])&&hit[1]<b[1])||(positive(direction[1])&&b[1]<hit[1]))return 0;
   output[0]=f((node.originX<<((node.level&7)<<2))+hit[0]);
   output[1]=f((node.originY<<((node.level&7)<<2))+hit[1]);output[2]=hit[2];
   if(option)option.node=node;return 1;
  }
 }
 return 0;
}
