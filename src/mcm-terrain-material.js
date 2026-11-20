import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {Discard,Fn,attribute,clamp,dot,float,floor,mix,mod,positionWorld,select,texture as tslTexture,uniform,vec2,vec3} from 'three/tsl';
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

// The renderer is a WebGPURenderer. It never runs Material.onBeforeCompile (that
// hook only exists in the WebGLRenderer path), so the preview must express the
// original texture lookup as a TSL colour node or the terrain renders untextured.
export function createMcmTerrainMaterial(resources,state,{bounds,dense=false}={}){
 const physics=state.physics,a=physics.nativePoint(0,0),b=physics.nativePoint(1,0),c=physics.nativePoint(0,1),scale=physics.terrain.worldToGrid;
 // The coarse mesh discards where the dense sand patch covers it; SandSurface
 // mutates this same Vector4 as the patch moves, so the uniform stays live.
 const boundsValue=bounds?.isUniformNode?bounds.value:bounds instanceof THREE.Vector4?bounds:new THREE.Vector4();
 const layout=uniform(new THREE.Vector4(resources.columns,resources.rows,resources.size,resources.side));
 const nativeX=uniform(new THREE.Vector3((b.x-a.x)*scale,(c.x-a.x)*scale,a.x*scale));
 const nativeZ=uniform(new THREE.Vector3((b.z-a.z)*scale,(c.z-a.z)*scale,a.z*scale));
 const quarter=uniform(physics.scene.terrainMode===1?0:1);
 const boundsNode=uniform(boundsValue);
 const material=new MeshStandardNodeMaterial({name:`mcm-original-terrain-${dense?'dense':'coarse'}`,roughness:1,vertexColors:false,polygonOffset:dense,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:dense?THREE.DoubleSide:THREE.FrontSide});
 // Native world coordinates for the original terrain grid: metres -> original units.
 const world=positionWorld.xz,grid=vec2(dot(nativeX,vec3(world.x,world.y,float(1))),dot(nativeZ,vec3(world.x,world.y,float(1))));
 const extent=layout.w.mul(16.0),clamped=clamp(grid,vec2(float(0)),vec2(extent.sub(0.0001)));
 const leaf=floor(clamped.div(16.0)),local=clamped.sub(leaf.mul(16.0));
 // Float leaf record: texture index, tile index, orientation, 1 when assigned.
 const info=tslTexture(resources.lookup,leaf.add(0.5).div(layout.w)),size=layout.z;
 const region=vec2(mod(info.y,4.0),mod(floor(info.y.div(16.0)),4.0)).mul(quarter);
 const base=region.mul(size.sub(2.0)).mul(0.25).add(1.0).div(size);
 const step=local.mul(size.sub(2.0).div(size)).mul(mix(0.0625,0.015625,quarter));
 const uv=base.add(step),orientation=info.z;
 // The stored orientation encodes a swap plus an optional per-axis flip.
 const swapped=orientation.equal(4.0).or(orientation.equal(5.0)).or(orientation.equal(6.0)).or(orientation.equal(7.0));
 const across=select(swapped,uv.y,uv.x),up=select(swapped,uv.x,uv.y);
 const flipX=orientation.equal(2.0).or(orientation.equal(3.0)).or(orientation.equal(6.0)).or(orientation.equal(7.0));
 const flipY=orientation.equal(1.0).or(orientation.equal(3.0)).or(orientation.equal(4.0)).or(orientation.equal(6.0));
 const texel=vec2(select(flipX,float(1.0).sub(across),across),select(flipY,float(1.0).sub(up),up));
 const cell=vec2(mod(info.x,layout.x),floor(info.x.div(layout.x)));
 const original=tslTexture(resources.atlas,cell.add(texel).div(vec2(layout.x,layout.y))).rgb;
 const assigned=info.w.greaterThan(0.5).and(info.x.greaterThanEqual(0.0));
 // Unassigned leaves stay neutral grey rather than sampling a random atlas cell.
 const tint=select(assigned,original,vec3(0.35)),colors=dense?tint.mul(attribute('color','vec3')):tint;
 material.colorNode=Fn(()=>{
  if(!dense){
   // A narrow overlap covers sample-coverage cracks at the coarse discard edge.
   Discard(boundsNode.y.greaterThan(boundsNode.x)
    .and(world.x.greaterThan(boundsNode.x.add(0.125))).and(world.x.lessThan(boundsNode.y.sub(0.125)))
    .and(world.y.greaterThan(boundsNode.z.add(0.125))).and(world.y.lessThan(boundsNode.w.sub(0.125))));
  }
  return colors;
 })();
 return material;
}
