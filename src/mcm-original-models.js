import * as THREE from 'three';
import {composeMcmWorldMatrix} from './physics/mcm/world-transform.js';
const url=new URL('./assets/mcm-original-models.bin',import.meta.url).href;
let pending;
export function loadMcmOriginalModels(){return pending??=fetch(url).then(async r=>{if(!r.ok)throw Error('Original models download failed');return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();}).catch(e=>{pending=null;throw e;});}
const world=node=>node.cacheValid?node.world:node.parent?composeMcmWorldMatrix(world(node.parent),node.local):node.local;
export function bindMcmModelNodes(model,visual){
 const mapping=new Map(),root=model.objects.filter(o=>!o.parent);if(root.length!==1)throw Error('Original model root mismatch');
 const attach=(object,node)=>{if(!node)throw Error('Missing original model node');mapping.set(object.name,node);const children=model.objects.filter(o=>o.parent===object.name),native=visual.components.map(c=>c.node).filter(n=>n.parent===node);if(children.length!==native.length)throw Error('Original model hierarchy differs');children.forEach((child,i)=>attach(child,native[i]));};
 attach(root[0],visual.components[1]?.node);if(mapping.size!==model.objects.length)throw Error('Unbound original model parts');return mapping;
}
export function createMcmOriginalModels(assets){
 const root=new THREE.Group(),parts=[],textures=new Map();let runtime=null,binding=null,currentSkin='',currentBike='',frame=null;
 root.name='mcm-original-models';
 const pose=()=>({matrix:new THREE.Matrix4(),position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:new THREE.Vector3()});
 const copy=(to,from)=>{to.matrix.copy(from.matrix);to.position.copy(from.position);to.quaternion.copy(from.quaternion);to.scale.copy(from.scale);};
 const texture=name=>{if(textures.has(name))return textures.get(name);const data=assets.textures[name];if(!data)throw Error('Missing original skin '+name);const pixels=Uint8Array.from(atob(data.rgba),c=>c.charCodeAt(0)),t=new THREE.DataTexture(pixels,data.width,data.height);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;textures.set(name,t);return t;};
 const materials={bike:new THREE.MeshStandardMaterial({map:texture('bike01.tga'),side:THREE.DoubleSide,alphaTest:.5,roughness:.9}),rider:new THREE.MeshStandardMaterial({map:texture('rider01.tga'),side:THREE.DoubleSide,alphaTest:.5,roughness:1})};
 for(const kind of ['bike','rider'])for(const object of assets.models[kind].objects)for(const surface of object.surfaces){const geometry=new THREE.BufferGeometry(),v=surface.vertices;geometry.setAttribute('position',new THREE.Float32BufferAttribute(v.flatMap(p=>p.slice(0,3)),3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(v.flatMap(p=>p.slice(5,8)),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(v.flatMap(p=>[p[3],1+p[4]]),2));geometry.setIndex(surface.triangles);const mesh=new THREE.Mesh(geometry,materials[kind]);mesh.matrixAutoUpdate=false;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);parts.push({kind,object,mesh});}
 for(const part of parts){part.previous=pose();part.current=pose();part.mesh.name=`mcm-${part.kind}-${part.object.name}`;}
 const rotation=new THREE.Matrix4(),matrix=new THREE.Matrix4(),scale=new THREE.Vector3(.3048,.3048,.3048),position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),interpolatedScale=new THREE.Vector3();
 const capture=state=>{
  const p=state.physics;rotation.makeRotationFromQuaternion(p.rotation);
  for(const part of parts){const m=world(binding[part.kind].get(part.object.name)),location=p.position(m.slice(12,15));matrix.fromArray(m);matrix.setPosition(0,0,0);matrix.premultiply(rotation);matrix.scale(scale);matrix.setPosition(location);part.current.matrix.copy(matrix);matrix.decompose(part.current.position,part.current.quaternion,part.current.scale);}
  frame=state.frame;
 };
 const reset=state=>{
  runtime=state.physics.runtime;binding=Object.fromEntries(['bike','rider'].map(k=>[k,bindMcmModelNodes(assets.models[k],runtime.loaded.visuals[k])]));capture(state);
  for(const part of parts)copy(part.previous,part.current);
 };
 const push=state=>{
  if(runtime!==state.physics.runtime){reset(state);return;}
  for(const part of parts)copy(part.previous,part.current);capture(state);
 };
 return {root,reset,push,update(state,skin='rider01',bikeSkin='bike01',alpha=1){
  if(runtime!==state.physics.runtime)reset(state);else if(frame!==state.frame)push(state);
  if(currentSkin!==skin){materials.rider.map=texture(skin+'.tga');materials.rider.needsUpdate=true;currentSkin=skin;}
  if(currentBike!==bikeSkin){materials.bike.map=texture(bikeSkin+'.tga');materials.bike.needsUpdate=true;currentBike=bikeSkin;}
  // Match the camera's one-physics-step interpolation timeline. These snapshots
  // belong only to presentation; native transform caches remain untouched.
  const t=Math.max(0,Math.min(1,alpha));
  for(const part of parts){const a=part.previous,b=part.current;
   if(t===0)part.mesh.matrix.copy(a.matrix);else if(t===1)part.mesh.matrix.copy(b.matrix);
   else{position.lerpVectors(a.position,b.position,t);quaternion.slerpQuaternions(a.quaternion,b.quaternion,t);interpolatedScale.lerpVectors(a.scale,b.scale,t);part.mesh.matrix.compose(position,quaternion,interpolatedScale);}
   part.mesh.matrixWorldNeedsUpdate=true;
  }
 },parts:parts.length};
}
