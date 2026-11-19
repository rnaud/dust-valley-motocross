import * as THREE from 'three';
import {floor,modelViewProjection,texture,uniform,uv,varying,vec3,vec4} from 'three/tsl';
// PS1 look: snap clip-space vertices to a coarse grid and use affine
// (non-perspective) texture mapping. WebGPU node materials cannot be patched
// with GLSL, so while the style is active every mesh is swapped to a cached
// node-material clone carrying a snapped vertexNode; restore swaps back.
function retroNodeMaterial(material,renderer,grid){
 const node=material.isNodeMaterial?material.clone():renderer.library.fromMaterial(material);
 if(!node)return null;
 if(material.isNodeMaterial){for(const key of ['colorNode','normalNode','emissiveNode','maskNode','positionNode','opacityNode','roughnessNode'])node[key]=material[key];}
 const clip=modelViewProjection,w=varying(clip.w);
 node.vertexNode=vec4(floor(clip.xy.div(clip.w).mul(grid).add(.5)).div(grid).mul(clip.w),clip.z,clip.w);
 if(material.map&&!material.isNodeMaterial){
  const affine=varying(uv().mul(clip.w)).div(w);
  const tint=material.color?.isColor?uniform(material.color):vec3(1),sample=texture(material.map,affine);
  node.colorNode=vec4(tint.mul(sample.rgb),sample.a);
 }
 node.userData={...material.userData,retroSource:material};
 return node;
}
export function prepareRetroMaterials(scene,renderer,grid,prepared){
 scene.traverse(object=>{
  if(!object.isMesh||object.userData.retroOriginal)return;
  const list=Array.isArray(object.material)?object.material:[object.material];
  if(list.some(m=>!m||!(m.isMeshStandardMaterial||m.isMeshBasicMaterial||m.isMeshStandardNodeMaterial||m.isMeshBasicNodeMaterial)))return;
  const swapped=list.map(m=>{if(!prepared.has(m))prepared.set(m,retroNodeMaterial(m,renderer,grid));return prepared.get(m)??m;});
  object.userData.retroOriginal=object.material;object.material=Array.isArray(object.material)?swapped:swapped[0];
  (prepared.objects??=new Set()).add(object);
 });
}
export function restoreRetroMaterials(prepared){
 for(const object of prepared.objects??[]){object.material=object.userData.retroOriginal;delete object.userData.retroOriginal;}
 for(const node of prepared.values())node?.dispose();
 prepared.clear();prepared.objects?.clear();
}
