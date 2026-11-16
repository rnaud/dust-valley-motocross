import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround;
// Original 429e70. Builds the four TL vertices, clipping only right/bottom.
// Texture metadata and viewport are services; all actor stores are retained.
export function buildMcmSceneLabelQuad(view,{viewport,textureWidth,textureHeight}){
 const u=o=>view.getUint32(o,true),i=o=>view.getInt32(o,true),put=(o,v)=>view.setUint32(o,v>>>0,true);
 const [vx,vy,width,height]=viewport.map(v=>v>>>0);
 let left,right,top,bottom,u0=0,v0=0,u1=1,v1=1;
 if(u(0xe0)){u0=f(div(i(0xd0),textureWidth|0));v0=f(div(i(0xd4),textureHeight|0));u1=f(div(i(0xd8),textureWidth|0));v1=f(div(i(0xdc),textureHeight|0));}
 if(u(0xbc)){
  const sx=mul(width,f(1/640)),sy=mul(height,f(1/480));
  left=f(add(mul(sx,i(0xc0)),vx));right=f(add(mul(sx,i(0xc8)),vx));
  top=f(add(mul(sy,i(0xc4)),vy));bottom=f(add(mul(sy,i(0xcc)),vy));
 }else{left=f(add(vx,i(0xc0)));right=f(add(vx,i(0xc8)));top=f(add(vy,i(0xc4)));bottom=f(add(vy,i(0xcc)));}
 const edgeX=(vx+width)>>>0,edgeY=(vy+height)>>>0;
 if(!(edgeX>right)){u1=f(add(mul(sub(1,div(sub(sub(right,vx),width),sub(right,left))),sub(u1,u0)),u0));right=f(edgeX);}
 if(!(edgeY>bottom)){v1=f(add(mul(sub(1,div(sub(sub(bottom,vy),height),sub(bottom,top))),sub(v1,v0)),v0));bottom=f(edgeY);}
 const color=u(0xe8)?((u(0xe4)<<24)|0xffffff)>>>0:0xffffffff;
 for(const [j,x,y,s,t]of [[0,left,top,u0,v0],[1,right,top,u1,v0],[2,right,bottom,u1,v1],[3,left,bottom,u0,v1]]){
  const o=0x3c+j*32;view.setFloat32(o,x,true);view.setFloat32(o+4,y,true);put(o+8,0x3727c5ac);put(o+12,0x3f800000);put(o+16,color);put(o+20,0);view.setFloat32(o+24,s,true);view.setFloat32(o+28,t,true);
 }
}
