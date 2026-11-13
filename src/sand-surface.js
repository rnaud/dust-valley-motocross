import * as THREE from 'three';
import {applyTerrainTexture} from './textures.js';

// Render the exact CPU collision samples; no visual-only displacement.
export class SandSurface {
 constructor(scene,textures,coarseMaterial){
  this.scene=scene;this.meshes=new Map();this.coarseMaterial=coarseMaterial;
  this.material=new THREE.MeshStandardMaterial({roughness:1});
  applyTerrainTexture(this.material,textures);this.material.map=textures.freeMacro;this.material.vertexColors=true;
 }
 update(sand){
  if(this.sand!==sand){for(const mesh of this.meshes.values()){this.scene.remove(mesh);mesh.geometry.dispose();}this.meshes.clear();this.sand=sand;}
  const bounds=this.coarseMaterial.userData.sandBounds.value;
  if(!sand){bounds.set(0,0,0,0);for(const mesh of this.meshes.values()){this.scene.remove(mesh);mesh.geometry.dispose();}this.meshes.clear();return;}
  const b=sand.bounds;bounds.set(b.minX,b.maxX,b.minZ,b.maxZ);
  for(const [key,mesh] of this.meshes)if(!sand.tiles.has(key)){this.scene.remove(mesh);mesh.geometry.dispose();this.meshes.delete(key);}
  for(const [key,tile] of sand.tiles){
   let mesh=this.meshes.get(key);const n=tile.data.length,segments=n-1;
   if(!mesh){
    // Vertical skirts conceal sub-grid cracks where the dense patch meets coarse terrain.
    // They never displace the top surface used for collision.
    const edges=[Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,j)=>j*n+n-1),Array.from({length:n},(_,i)=>(n-1)*n+n-1-i),Array.from({length:n},(_,j)=>(n-1-j)*n)];
    const skirtSources=edges.flat();
    const geo=new THREE.BufferGeometry(),positions=new Float32Array((n*n+skirtSources.length*2)*3),uv=new Float32Array((n*n+skirtSources.length*2)*2),indices=[];
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
     const v=j*n+i,x=tile.x+i*.25,z=tile.z-j*.25;
     positions[v*3]=x;positions[v*3+2]=z;uv[v*2]=(x+450)/900;uv[v*2+1]=1-(z+450)/900;
     if(i<segments&&j<segments){const a=v,d=a+1,b=a+n,c=b+1;indices.push(a,d,b,d,c,b);}
    }
    for(let k=0;k<skirtSources.length;k++){
     const source=skirtSources[k],v=n*n+k*2;
     for(let side=0;side<2;side++){positions[(v+side)*3]=positions[source*3];positions[(v+side)*3+2]=positions[source*3+2];uv[(v+side)*2]=uv[source*2];uv[(v+side)*2+1]=uv[source*2+1];}
     if(k%n<n-1)indices.push(v,v+1,v+2,v+1,v+3,v+2);
    }
    geo.userData.skirtSources=skirtSources;
    geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(positions.length).fill(1),3));
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(indices);
    mesh=new THREE.Mesh(geo,this.material);mesh.receiveShadow=true;mesh.userData.revision=-1;this.scene.add(mesh);this.meshes.set(key,mesh);
   }
   if(mesh.userData.revision!==tile.revision){
    const p=mesh.geometry.attributes.position;for(let j=0;j<n;j++)for(let i=0;i<n;i++)p.setY(j*n+i,tile.data[i][j]);
    mesh.geometry.userData.skirtSources.forEach((source,k)=>{const v=n*n+k*2;p.setY(v,p.getY(source));p.setY(v+1,p.getY(source)-2);});
    const colors=mesh.geometry.attributes.color;
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
     const index=j*n+i,x=p.getX(index),z=p.getZ(index);
     const depth=Math.max(0,-sand.displacementAt(x,z)),packed=sand.compaction(x,z);
     const disturbed=Math.min(1,depth/.055+packed*.3),shade=1-disturbed*.38;
     colors.setXYZ(index,shade,shade*(1-disturbed*.045),shade*(1-disturbed*.09));
    }
    mesh.geometry.userData.skirtSources.forEach((source,k)=>{const v=n*n+k*2;for(let side=0;side<2;side++)colors.setXYZ(v+side,colors.getX(source),colors.getY(source),colors.getZ(source));});
    colors.needsUpdate=true;p.needsUpdate=true;mesh.geometry.computeVertexNormals();
    // Shared edge gradients avoid lighting seams between independently rebuilt tiles.
    const normals=mesh.geometry.attributes.normal;
    for(const source of mesh.geometry.userData.skirtSources){const x=p.getX(source),z=p.getZ(source),dx=sand.height(x-.25,z)-sand.height(x+.25,z),dz=sand.height(x,z-.25)-sand.height(x,z+.25),length=Math.hypot(dx,.5,dz);normals.setXYZ(source,dx/length,.5/length,dz/length);}
    normals.needsUpdate=true;mesh.geometry.computeBoundingSphere();mesh.userData.revision=tile.revision;
   }
  }
 }
}
