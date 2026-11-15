import * as THREE from 'three';
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));

// Build a palette-expanded atlas and a leaf lookup without touching physics nodes.
export function createMcmTerrainTextures(scene){
 const {textures,palette:encodedPalette}=scene.rendering,palette=decode(encodedPalette);
 const size=textures[0].width,columns=Math.ceil(Math.sqrt(textures.length)),rows=Math.ceil(textures.length/columns);
 const levels=[0,1].map(level=>{
  const tileSize=size/(2**level),width=columns*tileSize,height=rows*tileSize,pixels=new Uint8Array(width*height*4);
  textures.forEach((texture,index)=>{
   if(texture.format!==4||texture.width!==size||texture.height!==size)throw Error('Unsupported original terrain atlas layout');
   const indices=decode(level?texture.mip:texture.pixels);if(indices.length!==tileSize*tileSize||palette.length!==768)throw Error('Invalid original terrain texture');
   for(let y=0;y<tileSize;y++)for(let x=0;x<tileSize;x++){
    const source=indices[y*tileSize+x]*3,destination=((Math.floor(index/columns)*tileSize+y)*width+index%columns*tileSize+x)*4;
    pixels.set(palette.subarray(source,source+3),destination);pixels[destination+3]=255;
   }
  });
  return {data:pixels,width,height};
 });
 const atlas=new THREE.DataTexture(levels[0].data,levels[0].width,levels[0].height);atlas.mipmaps=levels;atlas.colorSpace=THREE.SRGBColorSpace;atlas.magFilter=THREE.LinearFilter;atlas.minFilter=THREE.LinearMipmapLinearFilter;atlas.needsUpdate=true;
 const terrain=scene.terrain,root=terrain.nodes[terrain.root],side=16**root.level,leaves=new Float32Array(side*side*4);let missing=0;
 const visit=(node,x,z)=>{
  if(node.level){const span=16**(node.level-1);node.children?.forEach((id,i)=>{if(id!==null)visit(terrain.nodes[id],x+i%16*span,z+Math.floor(i/16)*span);});return;}
  const offset=(z*side+x)*4;leaves.set([node.textureIndex,node.tileIndex,node.textureOrientation,1],offset);if(node.textureIndex<0)missing++;
 };visit(root,0,0);
 const lookup=new THREE.DataTexture(leaves,side,side,THREE.RGBAFormat,THREE.FloatType);lookup.needsUpdate=true;
 return {atlas,lookup,size,columns,rows,side,missing,dispose(){atlas.dispose();lookup.dispose();}};
}

export function createMcmTerrainMaterial(resources,state,{bounds,dense=false}={}){
 const physics=state.physics,a=physics.nativePoint(0,0),b=physics.nativePoint(1,0),c=physics.nativePoint(0,1),scale=physics.terrain.worldToGrid;
 const uniforms={mcmAtlas:{value:resources.atlas},mcmLeaves:{value:resources.lookup},mcmAtlasLayout:{value:new THREE.Vector4(resources.columns,resources.rows,resources.size,resources.side)},
  mcmNativeX:{value:new THREE.Vector3((b.x-a.x)*scale,(c.x-a.x)*scale,a.x*scale)},mcmNativeZ:{value:new THREE.Vector3((b.z-a.z)*scale,(c.z-a.z)*scale,a.z*scale)},
  mcmQuarter:{value:physics.scene.terrainMode===1?0:1},mcmBounds:bounds??{value:new THREE.Vector4()},mcmDense:{value:dense?1:0}};
 const material=new THREE.MeshStandardMaterial({roughness:1,vertexColors:dense});
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec2 mcmWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmcmWorld=(modelMatrix*vec4(position,1.0)).xz;');
  shader.fragmentShader=`varying vec2 mcmWorld;
   uniform sampler2D mcmAtlas,mcmLeaves;
   uniform vec4 mcmAtlasLayout,mcmBounds;
   uniform vec3 mcmNativeX,mcmNativeZ;
   uniform float mcmQuarter,mcmDense;
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   if(mcmDense<0.5 && mcmBounds.y>mcmBounds.x && mcmWorld.x>mcmBounds.x && mcmWorld.x<mcmBounds.y && mcmWorld.y>mcmBounds.z && mcmWorld.y<mcmBounds.w)discard;
   vec2 grid=vec2(dot(mcmNativeX,vec3(mcmWorld,1.0)),dot(mcmNativeZ,vec3(mcmWorld,1.0)));
   float extent=mcmAtlasLayout.w*16.0;
   grid=clamp(grid,vec2(0.0),vec2(extent-0.0001));
   vec2 leaf=floor(grid/16.0),local=grid-leaf*16.0;
   vec4 info=texture2D(mcmLeaves,(leaf+0.5)/mcmAtlasLayout.w);
   float texSize=mcmAtlasLayout.z;
   vec2 region=vec2(mod(info.y,4.0),mod(floor(info.y/16.0),4.0))*mcmQuarter;
   vec2 uv=(region*(texSize-2.0)*0.25+1.0)/texSize + local*((texSize-2.0)/texSize)*mix(0.0625,0.015625,mcmQuarter);
   float orientation=info.z;
   if(orientation==1.0)uv.y=1.0-uv.y;
   else if(orientation==2.0)uv.x=1.0-uv.x;
   else if(orientation==3.0)uv=1.0-uv;
   else if(orientation==4.0)uv=vec2(uv.y,1.0-uv.x);
   else if(orientation==5.0)uv=uv.yx;
   else if(orientation==6.0)uv=1.0-uv.yx;
   else if(orientation==7.0)uv=vec2(1.0-uv.y,uv.x);
   vec2 cell=vec2(mod(info.x,mcmAtlasLayout.x),floor(info.x/mcmAtlasLayout.x));
   vec3 originalColor=texture2D(mcmAtlas,(cell+uv)/mcmAtlasLayout.xy).rgb;
   diffuseColor.rgb*=info.w>0.5 && info.x>=0.0?originalColor:vec3(0.35);
  `);
 };
 material.customProgramCacheKey=()=>`mcm-original-terrain-${dense?'dense':'coarse'}-v1`;
 return material;
}
