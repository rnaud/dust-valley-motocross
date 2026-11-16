import {notifyMcmTerrainVertex} from './terrain-vertex-propagation.js';
const notify=(env,...args)=>env.notifyVertex?env.notifyVertex(...args):notifyMcmTerrainVertex(...args,env);

// Original 48e1c0. Interior patches notify immediate siblings in the original
// order; patches on the parent boundary start a coordinate-based root walk.
export function propagateMcmTerrainBoundary(parent,address,x,y,active,mask,source,env){
 const child=env.node(address),parentNode=env.node(parent),id=child.getUint32(0x30,true);
 const column=id&15,row=id&0xf0;
 if(column&&column!==15&&row&&row!==0xf0){
  const sibling=(delta,nx,ny)=>{
   const currentId=child.getUint32(0x30,true),table=parentNode.getUint32(0x54,true);
   const next=env.u32(table+((currentId+delta)<<2));
   if(next)notify(env,next,nx,ny,active,mask,source);
  };
  if(x===0){
   sibling(-1,16,y);
   if(y===0){sibling(-17,16,16);sibling(-16,0,16);}
   else if(y===16){sibling(15,16,0);sibling(16,0,0);}
  }else if(x===16){
   sibling(1,0,y);
   if(y===0){sibling(-15,0,16);sibling(-16,16,16);}
   else if(y===16){sibling(17,0,0);sibling(16,16,0);}
  }else if(y===0)sibling(-16,x,16);
  else if(y===16)sibling(16,x,0);
  return;
 }
 let root=parent;
 while(env.node(root).getUint32(0x58,true))root=env.node(root).getUint32(0x58,true);
 const level=parentNode.getInt32(0x20,true)-1,shift=(level>0?level*4:0)&31;
 const worldX=(child.getInt32(0x28,true)+x)<<shift,worldY=(child.getInt32(0x2c,true)+y)<<shift;
 descendMcmTerrainBoundary(root,worldX,worldY,active,mask,source,child.getInt32(0x20,true),env);
}

// Original 48de10. Shared-edge coordinates can touch up to four descendants.
export function descendMcmTerrainBoundary(address,x,y,active,mask,source,minimumLevel,env){
 const node=env.node(address),get=o=>node.getUint32(o,true),level=node.getInt32(0x20,true);
 const vertexPointer=(vx,vy)=>(get(0x50)+((env.vertexRows[vy]+vx)<<4))>>>0;
 if(!level){if(vertexPointer(x,y)!==(source>>>0))notify(env,address,x,y,active,mask,source);return;}
 const shift=(level>0?level*4:0)&31,size=1<<shift,lowMask=(size-1)|0;
 if(!(x&lowMask)&&!(y&lowMask)){
  const vx=x>>shift,vy=y>>shift;
  if(vertexPointer(vx,vy)!==(source>>>0))notify(env,address,vx,vy,active,mask,source);
 }
 const firstTable=get(0x54);
 if(!firstTable||minimumLevel>=node.getInt32(0x20,true))return;
 let right=x,bottom=y,left=(x-1)|0,top=(y-1)|0;
 for(let n=node.getInt32(0x20,true);n>0;n--){right=Math.trunc(right/16);bottom=Math.trunc(bottom/16);left=Math.trunc(left/16);top=Math.trunc(top/16);}
 const localX=x&lowMask,localY=y&lowMask;
 const visit=(column,row,nx,ny,useInitial=false)=>{
  if(column>=16||row>=16)return;
  const table=useInitial?firstTable:get(0x54),child=env.u32(table+((env.rowOffsets[row]+column)<<2));
  if(child)descendMcmTerrainBoundary(child,nx,ny,active,mask,source,minimumLevel,env);
 };
 if(left===right){
  if(top===bottom)visit(right,bottom,localX,localY,true);
  else{visit(right,bottom,localX,localY,true);visit(right,top,localX,(localY+size)|0);}
 }else if(top===bottom){
  visit(right,bottom,localX,localY,true);visit(left,bottom,(localX+size)|0,localY);
 }else{
  visit(right,bottom,localX,localY,true);
  // Original 48e0e0..48e0e2 adds the masks before ANDing the Y coordinate.
  visit(right,top,localX,y&((lowMask+size)|0));
  visit(left,bottom,(localX+size)|0,localY);
  visit(left,top,(localX+size)|0,(localY+size)|0);
 }
}
