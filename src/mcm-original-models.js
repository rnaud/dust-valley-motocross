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
 const root=new THREE.Group(),parts=[],textures=new Map();let runtime=null,binding=null,currentSkin='',currentBike='';
 const texture=name=>{if(textures.has(name))return textures.get(name);const data=assets.textures[name];if(!data)throw Error('Missing original skin '+name);const pixels=Uint8Array.from(atob(data.rgba),c=>c.charCodeAt(0)),t=new THREE.DataTexture(pixels,data.width,data.height);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;textures.set(name,t);return t;};
 const materials={bike:new THREE.MeshStandardMaterial({map:texture('bike01.tga'),side:THREE.DoubleSide,alphaTest:.5,roughness:.9}),rider:new THREE.MeshStandardMaterial({map:texture('rider01.tga'),side:THREE.DoubleSide,alphaTest:.5,roughness:1})};
 for(const kind of ['bike','rider'])for(const object of assets.models[kind].objects)for(const surface of object.surfaces){const geometry=new THREE.BufferGeometry(),v=surface.vertices;geometry.setAttribute('position',new THREE.Float32BufferAttribute(v.flatMap(p=>p.slice(0,3)),3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(v.flatMap(p=>p.slice(5,8)),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(v.flatMap(p=>[p[3],1+p[4]]),2));geometry.setIndex(surface.triangles);const mesh=new THREE.Mesh(geometry,materials[kind]);mesh.matrixAutoUpdate=false;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);parts.push({kind,object,mesh});}
 const rotation=new THREE.Matrix4(),matrix=new THREE.Matrix4(),scale=new THREE.Vector3(.3048,.3048,.3048);
 return {root,update(state,skin='rider01',bikeSkin='bike01'){
  const p=state.physics;if(runtime!==p.runtime){runtime=p.runtime;binding=Object.fromEntries(['bike','rider'].map(k=>[k,bindMcmModelNodes(assets.models[k],runtime.loaded.visuals[k])]));}
  if(currentSkin!==skin){materials.rider.map=texture(skin+'.tga');materials.rider.needsUpdate=true;currentSkin=skin;}
  if(currentBike!==bikeSkin){materials.bike.map=texture(bikeSkin+'.tga');materials.bike.needsUpdate=true;currentBike=bikeSkin;}
  rotation.makeRotationFromQuaternion(p.rotation);
  for(const part of parts){const m=world(binding[part.kind].get(part.object.name)),position=p.position(m.slice(12,15));matrix.fromArray(m);matrix.setPosition(0,0,0);matrix.premultiply(rotation);matrix.scale(scale);matrix.setPosition(position);part.mesh.matrix.copy(matrix);part.mesh.matrixWorldNeedsUpdate=true;}
 },parts:parts.length};
}
