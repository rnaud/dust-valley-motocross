import {Mesh} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// For static parts only: retain material boundaries, bake transforms into geometry.
export function batchMeshes(roots,parent){
  const groups=new Map();
  for(const root of roots){root.updateMatrixWorld(true);root.traverse(object=>{
    if(!object.isMesh)return;
    const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    if(!groups.has(object.material))groups.set(object.material,[]);
    groups.get(object.material).push(geometry);
  });}
  const result=[];
  for(const [material,parts] of groups){
    const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
    const mesh=new Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);result.push(mesh);
  }
  return result;
}
