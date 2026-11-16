// Original 48b190 / 48b700. Each result reports the running triangle count and
// whether the caller's half has been handled (including finer child coverage).
const emit=(env,count,points)=>{
 for(let i=0;i<3;i++)env.indices.setUint16((count*3+i)*2,env.vertex(...points[i]),true);
 return (count+1)>>>0;
};
const absent=(node,x,y,env)=>!(node.getUint8(0x60+env.vertexRows[y]+x)&128)&&(!node.getUint32(0x54,true)||node.getUint32(0x1b4,true));
export function buildMcmTerrainDiagonal(address,depth,count,x,y,dx,dy,env){
 const node=env.node(address);depth--;x+=dx;y+=dy;
 if(absent(node,x,y,env))return{count,handled:0};
 let first=0,second=0;
 if(depth){
  const a=buildMcmTerrainAxis(address,depth,count,x,y,-dx,0,env);count=a.count;first=a.handled;
  const b=buildMcmTerrainAxis(address,depth,count,x,y,0,-dy,env);count=b.count;second=b.handled;
 }else if(node.getUint32(0x54,true))return{count,handled:1};
 if(!first)count=emit(env,count,[[x,y],[x-dx,y-dx],[x-dx,y+dx]]);
 if(!second)count=emit(env,count,[[x,y],[x+dy,y-dy],[x-dy,y-dy]]);
 return{count,handled:1};
}
export function buildMcmTerrainAxis(address,depth,count,x,y,dx,dy,env){
 const node=env.node(address);depth--;if(dx)x+=dx;else y+=dy;
 if(absent(node,x,y,env))return{count,handled:0};
 let first=0,second=0;
 if(depth){
  const half=-Math.trunc((dx||dy)/2);
  const a=buildMcmTerrainDiagonal(address,depth,count,x,y,half,half,env);count=a.count;first=a.handled;
  const b=buildMcmTerrainDiagonal(address,depth,count,x,y,dx?half:-half,dx?-half:half,env);count=b.count;second=b.handled;
 }else if(node.getUint32(0x54,true)&&!node.getUint8(0x181)){
  const table=node.getUint32(0x54,true);
  const covered=(cx,cy)=>{
   const pointer=env.u32(table+(env.rowOffsets[cy]+cx)*4);if(!pointer)return 1;
   const child=env.node(pointer);
   return ((child.getUint32(0x1a0,true)+child.getUint32(0x1ac,true))>>>0)||!child.getUint32(0x184,true)?1:0;
  };
  if(!dx){
   if(dy>0){first=covered(x-1,y-1);second=covered(x,y-1);}
   else{first=covered(x,y);second=covered(x-1,y);}
  }else if(dx>0){first=covered(x-1,y-1);second=covered(x-1,y);}
  else{first=covered(x,y);second=covered(x,y-1);}
 }
 if(!first){const distance=dx||dy;count=emit(env,count,[[x,y],[x,y-distance],[x-distance,y]]);}
 if(!second)count=emit(env,count,dx?[[x,y],[x-dx,y],[x,y+dx]]:[[x,y],[x+dy,y],[x,y-dy]]);
 return{count,handled:1};
}
// Original 48bfd0 preserves call order as well as triangle winding.
export function buildMcmTerrainFallback(count,x,y,dx,dy,env){
 const at=count*6;
 if(dx===dy){
  env.indices.setUint16(at+4,env.vertex(x,y),true);
  env.indices.setUint16(at,env.vertex(x,y+dy),true);
  env.indices.setUint16(at+2,env.vertex(x+dx,y),true);
 }else return emit(env,count,[[x,y],[x+dx,y],[x,y+dy]]);
 return(count+1)>>>0;
}
