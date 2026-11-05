import * as THREE from 'three';

// Small, world-anchored details provide nearby scale cues without thousands of objects.
export class GroundDetail {
  constructor(scene,height){
    this.height=height;this.cell='';this.dummy=new THREE.Object3D();
    this.pebbles=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#96795a',roughness:1}),17*17*3);
    this.scrub=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,4),new THREE.MeshStandardMaterial({color:'#797744',roughness:1}),17*17);
    for(const mesh of [this.pebbles,this.scrub]){mesh.frustumCulled=false;mesh.receiveShadow=true;scene.add(mesh);}
  }
  update(x,z,force=false){
    const cx=Math.floor(x/12),cz=Math.floor(z/12),cell=`${cx},${cz}`;
    if(cell===this.cell&&!force)return;this.cell=cell;
    let rock=0,grass=0;
    for(let i=-8;i<=8;i++)for(let j=-8;j<=8;j++){
      let seed=((cx+i)*73856093^(cz+j)*19349663)>>>0;
      const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      for(let k=0;k<4;k++){
        const px=(cx+i+random())*12,pz=(cz+j+random())*12;
        const edge=THREE.MathUtils.clamp((100-Math.hypot(px-x,pz-z))/16,0,1);
        const size=(k<3?.08+random()*.15:.18+random()*.25)*edge;
        this.dummy.position.set(px,this.height(px,pz)+(k<3?size*.15:size*.5),pz);
        this.dummy.rotation.set(0,random()*Math.PI*2,k<3?random()*.3:0);
        this.dummy.scale.set(size,k<3?size*.5:size,size*.8);this.dummy.updateMatrix();
        if(k<3)this.pebbles.setMatrixAt(rock++,this.dummy.matrix);else this.scrub.setMatrixAt(grass++,this.dummy.matrix);
      }
    }
    this.pebbles.instanceMatrix.needsUpdate=true;this.scrub.instanceMatrix.needsUpdate=true;
  }
}
