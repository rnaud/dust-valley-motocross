import {beginMcmTerrainVertices,buildMcmTerrainVertex} from './terrain-vertex-builder.js';
import {buildMcmTerrainDiagonal,buildMcmTerrainFallback} from './terrain-triangles.js';
// Original read-only table at 4e8538, verified in the pinned executable.
export const MCM_TERRAIN_EMISSION_BLOCKS=Object.freeze([0,4,64,68,8,12,72,76,128,132,192,196,136,140,200,204]);
const requireService=(env,name)=>{if(typeof env[name]!=='function')throw Error('Unconnected terrain emission service: '+name);return env[name];};

// Original 48ac20. Traversal revisits the same node at smaller block sizes;
// parent triangle accounting also runs on those partial-block returns.
export function emitMcmTerrain(address,x,y,size,block,env){
 const node=env.node(address),get=o=>node.getUint32(o,true),put=(o,v)=>node.setUint32(o,v>>>0,true);
 if(!get(0x184))return 1;
 if(get(0x54)&&!node.getUint8(0x181)){
  size>>=1;
  if(size===8){
   put(0x1ac,0);
   for(let q=0;q<4;q++)if(get(0x184)&(2<<q))emitMcmTerrain(address,x+(q&1?size:0),y+(q&2?size:0),size,q*4,env);
  }else if(size===4){
   for(let q=0;q<4;q++)if(get(0x184)&((0x20<<q)<<(block&31)))emitMcmTerrain(address,x+(q&1?size:0),y+(q&2?size:0),size,block+q,env);
  }else{
   for(let row=0;row<64;row+=16)for(let col=0;col<4;col++){
    const child=env.u32(get(0x54)+(MCM_TERRAIN_EMISSION_BLOCKS[block]+row+col)*4);
    if(child&&env.node(child).getUint32(0x184,true))emitMcmTerrain(child,0,0,16,0,env);
   }
  }
  if(size===8)size=16;
 }
 if(size===16&&node.getUint8(0x182)&&get(0x1b4)){
  const owner=env.owner(get(0x5c)),oldFirst=get(0x1a4),oldSecond=get(0x1a8);
  owner.setUint32(0xa4,(owner.getUint32(0xa4,true)+1)>>>0,true);
  env.textureScale=node.getFloat32(0x1d8,true);beginMcmTerrainVertices(env.builder,address);
  const triangles={...env,vertex:(vx,vy)=>buildMcmTerrainVertex(env.builder,node,env.bank(get(0x50)),vx,vy,{...env,textureScale:env.textureScale})};
  const diagonal=get(0x30)&0x11,same=diagonal!==0&&diagonal!==0x11;
  const starts=same?[[0,0,8,8],[16,16,-8,-8]]:[[0,16,8,-8],[16,0,-8,8]];
  let count=0;
  for(let half=0;half<2;half++){
   const offset=0x1a4+half*4;put(offset,count);
   const [sx,sy,dx,dy]=starts[half];
   count=buildMcmTerrainDiagonal(address,8,count,sx,sy,dx,dy,triangles).count;
   const parent=get(0x58);
   if(count===get(offset)&&!get(0x1ac)&&parent&&!env.node(parent).getUint32(0x1b4,true))count=buildMcmTerrainFallback(count,sx,sy,dx*2,dy*2,triangles);
   put(offset,count-get(offset));
  }
  put(0x1a0,count);
  if((!get(0x1a4)!==!oldFirst)||(!get(0x1a8)!==!oldSecond)){
   const parent=get(0x58);if(parent)env.node(parent).setUint8(0x182,1);
  }
  if(!count){put(0x1c0,0);put(0x1c4,0);}
  else{
   put(0x1c0,env.builder.getUint32(0x2d30,true));put(0x1c4,Math.imul(count,3));
   for(const [pointerOffset,countOffset,capacityOffset,width,extra,source]of[
    [0x1b8,0x1c0,0x1c8,32,32,new Uint8Array(env.builder.buffer,env.builder.byteOffset+0x910,env.builder.byteLength-0x910)],
    [0x1bc,0x1c4,0x1cc,2,2,new Uint8Array(env.indices.buffer,env.indices.byteOffset,env.indices.byteLength)],
   ]){
    if(!get(pointerOffset)||node.getInt32(capacityOffset,true)<node.getInt32(countOffset,true)){
     requireService(env,'free')(address,get(pointerOffset));put(capacityOffset,0);
     put(pointerOffset,requireService(env,'malloc')(address,(Math.imul(get(countOffset),width)+extra)>>>0));
    }
    if(get(pointerOffset)){
     put(capacityOffset,get(countOffset));
     requireService(env,'copy')(get(pointerOffset),source,(Math.imul(get(countOffset),width))>>>0);
    }
   }
  }
  node.setUint8(0x182,0);
 }
 const parent=get(0x58);
 if(parent){const p=env.node(parent);p.setUint32(0x1ac,(p.getUint32(0x1ac,true)+get(0x1a0)+get(0x1ac))>>>0,true);}
 return 1;
}
