import * as THREE from 'three';

// Bounded, persistent tread ribbons. One mesh/draw call for both wheels.
export class TireTracks {
  constructor(scene,{capacity=6000,texture=null}={}) {
    this.capacity=capacity;this.count=0;this.cursor=0;this.last=[null,null];this.distance=[0,0];
    this.positions=new Float32Array(capacity*18);this.uvs=new Float32Array(capacity*12);
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('uv',new THREE.BufferAttribute(this.uvs,2).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setDrawRange(0,0);
    this.mesh=new THREE.Mesh(this.geometry,new THREE.MeshBasicMaterial({map:texture,color:0x46311c,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));
    this.mesh.frustumCulled=false;this.mesh.renderOrder=1;scene.add(this.mesh);
  }
  breakTrail(){this.last=[null,null];}
  clear(){this.breakTrail();this.count=0;this.cursor=0;this.distance=[0,0];this.geometry.setDrawRange(0,0);}
  update(contacts,height){
    for(let wheel=0;wheel<2;wheel++){
      const p=contacts[wheel];
      if(!p){this.last[wheel]=null;continue;}
      const before=this.last[wheel];
      if(!before){this.last[wheel]={...p};continue;}
      const dx=p.x-before.x,dz=p.z-before.z,length=Math.hypot(dx,dz);
      if(length<.28)continue;
      if(length>2){this.last[wheel]={...p};continue;}
      const nx=dz/length*.15,nz=-dx/length*.15;
      const corners=[[before.x+nx,before.z+nz],[before.x-nx,before.z-nz],[p.x+nx,p.z+nz],[p.x-nx,p.z-nz]];
      const v0=this.distance[wheel],v1=v0+length/.55;
      const uv=[[0,v0],[1,v0],[0,v1],[1,v1]];
      const indices=[0,1,2,2,1,3],base=this.cursor*18,uvBase=this.cursor*12;
      for(let i=0;i<6;i++){
        const [x,z]=corners[indices[i]];
        this.positions.set([x,height(x,z)+.035,z],base+i*3);
        this.uvs.set(uv[indices[i]],uvBase+i*2);
      }
      this.distance[wheel]=v1;this.last[wheel]={...p};
      this.cursor=(this.cursor+1)%this.capacity;this.count=Math.min(this.capacity,this.count+1);
      this.geometry.setDrawRange(0,this.count*6);
      this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.uv.needsUpdate=true;
    }
  }
}

export function createTreadTexture(){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(3,0,58,128);
  ctx.fillStyle='rgba(255,255,255,.5)';
  for(let y=-16;y<144;y+=24){
    ctx.beginPath();ctx.moveTo(7,y);ctx.lineTo(29,y+7);ctx.lineTo(29,y+18);ctx.lineTo(7,y+11);ctx.fill();
    ctx.beginPath();ctx.moveTo(35,y+7);ctx.lineTo(57,y);ctx.lineTo(57,y+11);ctx.lineTo(35,y+18);ctx.fill();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapT=THREE.RepeatWrapping;return texture;
}
