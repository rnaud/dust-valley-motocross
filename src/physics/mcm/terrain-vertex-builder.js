// Original 489f50: retain vertex storage, advance the cache generation, and
// clear cache entries only when the unsigned generation wraps through zero.
export function beginMcmTerrainVertices(builder,nodeAddress){
 builder.setUint32(0,nodeAddress>>>0,true);
 builder.setUint32(0x2d30,0,true);
 const generation=(builder.getUint32(4,true)+1)>>>0;
 builder.setUint32(4,generation||1,true);
 if(!generation)for(let offset=8;offset<0x910;offset+=4)builder.setUint32(offset,0,true);
}

// Original 48b350. Cache hits retain the existing vertex index and all bytes.
// The unlit format writes only its color word, leaving the other two words.
export function buildMcmTerrainVertex(builder,node,bank,x,y,{vertexRows,normalsEnabled,textureScale}){
 const u=o=>builder.getUint32(o,true),put=(o,v)=>builder.setUint32(o,v>>>0,true);
 const index=vertexRows[y]+x,cache=8+index*8,generation=u(4);
 if(u(cache)>=generation)return u(cache+4);
 put(cache,generation);const count=u(0x2d30);put(cache+4,count);
 const output=0x910+count*32,entry=index*16,f=o=>node.getFloat32(o,true),store=(o,v)=>builder.setFloat32(output+o,v,true);
 store(0,(node.getInt32(0x28,true)+x)<<(node.getUint8(0x24)&31));
 store(8,(node.getInt32(0x2c,true)+y)<<(node.getUint8(0x24)&31));
 store(4,(bank.getUint16(entry+2,true)-f(0x0c))*f(0x10)+f(0x0c));
 if(normalsEnabled){
  if(node.getUint32(0x10,true)>0x80000000){
   store(12,-bank.getFloat32(entry+4,true));
   put(output+16,bank.getUint32(entry+8,true));
   store(20,-bank.getFloat32(entry+12,true));
  }else for(let i=0;i<3;i++)put(output+12+i*4,bank.getUint32(entry+4+i*4,true));
 }else put(output+16,0xffffffff);
 store(24,x*textureScale+f(0x1d4));store(28,y*textureScale+f(0x1d0));
 const mode=node.getUint32(0x48,true),uv=o=>builder.getFloat32(output+o,true);
 if([2,3,4,6].includes(mode))store(24,1-uv(24));
 if([1,3,7].includes(mode))store(28,1-uv(28));
 if(mode>=4&&mode<=7){const a=u(output+24);put(output+24,u(output+28));put(output+28,a);}
 if(mode===6)store(24,1-uv(24));
 put(0x2d30,count+1);return u(cache+4);
}
