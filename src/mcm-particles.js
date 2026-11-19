import * as THREE from 'three';
import {sortMcmParticlesByDepth} from './physics/mcm/particle-sort.js';
import {particleTexture} from './mcm-particle-assets.js';
// Presentation only: read retained native slots; never tick, sort or write them.
// Original per-scene A4R4G4B4 atlas and constructor UVs; no procedural masks.
const nearestEven=x=>{const lo=Math.floor(x),part=x-lo;return part<.5?lo:part>.5?lo+1:lo%2===0?lo:lo+1;};
export class McmParticles{
 constructor(){
  const g=new THREE.InstancedBufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));g.setIndex([0,1,2,0,2,3]);
  this.centers=new Float32Array(3000);this.colors=new Float32Array(4000);this.sizes=new Float32Array(1000);this.sprites=new Float32Array(1000);this.uvRects=new Float32Array(4000);this.assets=null;this.textureName=null;
  for(const [name,array,size]of [['center',this.centers,3],['tint',this.colors,4],['radius',this.sizes,1],['sprite',this.sprites,1],['uvRect',this.uvRects,4]])g.setAttribute(name,new THREE.InstancedBufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
  g.instanceCount=0;
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:true,uniforms:{...(THREE.UniformsLib?.fog),atlas:{value:null}},vertexShader:`
   attribute vec3 center;attribute vec4 tint,uvRect;attribute float radius;
   varying vec2 spriteUV;varying vec4 rgba;
   #include <fog_pars_vertex>
   void main(){spriteUV=mix(uvRect.xy,uvRect.zw,vec2(position.x*.5+.5,.5-position.y*.5));rgba=tint;vec4 mvPosition=modelViewMatrix*vec4(center,1.);mvPosition.xy+=position.xy*radius;gl_Position=projectionMatrix*mvPosition;
   #include <fog_vertex>
   }`,fragmentShader:`
   uniform sampler2D atlas;varying vec2 spriteUV;varying vec4 rgba;
   #include <fog_pars_fragment>
   void main(){vec4 texel=texture2D(atlas,spriteUV);gl_FragColor=texel*rgba;if(gl_FragColor.a<.0039)discard;
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
   }`});
  this.root=new THREE.Mesh(g,m);this.root.name='mcm-recovered-particles';this.root.frustumCulled=false;this.count=0;this.nativeCount=0;this.rows=[];
 }
 setAssets(assets){this.assets=assets;}
 update(state,camera,alpha=1){
  const physics=state.physics,pool=physics?.shared?.particles?.pool??physics?.runtime?.external?.pool;
  this.rows.length=0;this.nativeCount=pool?.count??0;
  if(this.assets){const name=physics?.scene?.sceneSettings?.particleTexture??'particles\\dirtpart.tga';if(name!==this.textureName){this.root.material.uniforms.atlas.value?.dispose();this.root.material.uniforms.atlas.value=particleTexture(this.assets,name);this.textureName=name;}}
  if(state.physicsBackend==='recovered-core'&&pool){
   camera.updateMatrixWorld();const e=camera.matrixWorldInverse.elements;
   for(let i=0;i<Math.min(pool.count,1000);i++){
    const p=pool.particle(i),f=o=>p.getFloat32(o,true),flags=p.getUint32(0x34,true),age=f(0x14),life=f(0x18),radius=f(0x1c)*.3048;
    if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(age)||life<=0||age>life)continue;
    const lag=(flags&4)?(1-alpha)*.02:0,point=physics.position([f(0)-(lag?f(0x38)*lag:0),f(4)+.5-(lag?f(0x3c)*lag:0),f(8)-(lag?f(0x40)*lag:0)]);
    if(!Number.isFinite(point.x+point.y+point.z))continue;
    const color=p.getUint32(0xc,true),fade=flags&2?Math.max(0,1-age/life):1;
    this.rows.push({point,radius,color,flags,fade,sprite:p.getUint32(0x10,true),depth:e[2]*point.x+e[6]*point.y+e[10]*point.z+e[14]});
   }
   sortMcmParticlesByDepth(this.rows,r=>-r.depth);
  }
  this.count=this.rows.length;this.root.geometry.instanceCount=this.count;
  let inheritedColor=0xffffff,inheritedAlpha=1;
  this.rows.forEach((r,i)=>{
   this.centers.set([r.point.x,r.point.y,r.point.z],i*3);
   if(!(r.flags&1)){inheritedColor=r.color&0xffffff;inheritedAlpha=(r.color>>>24|(r.flags&2?Math.max(0,nearestEven(Math.fround(r.fade*255-.5))):255))/255;}
   const color=new THREE.Color(inheritedColor);this.colors.set([color.r,color.g,color.b,inheritedAlpha],i*4);this.sizes[i]=r.radius;this.sprites[i]=r.sprite;
   if(this.assets){const uv=this.assets.uv,at=r.sprite*8;if(at+7>=uv.length)throw Error('Unknown original particle sprite '+r.sprite);this.uvRects.set([uv[at],uv[at+1],uv[at+4],uv[at+5]],i*4);}
  });
  for(const a of Object.values(this.root.geometry.attributes))if(a.isInstancedBufferAttribute)a.needsUpdate=true;
 }
}
