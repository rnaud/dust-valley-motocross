import * as THREE from 'three';
// A presentation shell over the existing surface; collision remains untouched.
export class VoxelTerrain{
 constructor(){
  this.cell=2;this.width=96;this.lastX=NaN;this.lastZ=NaN;this.lastHeight=null;
  this.root=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),this.width**2*3);
  this.root.name='voxel-terrain-experiment';this.root.frustumCulled=false;this.root.receiveShadow=true;this.root.visible=false;
  this.matrix=new THREE.Matrix4();this.color=new THREE.Color();
 }
 update(x,z,height){
  const cx=Math.floor(x/this.cell),cz=Math.floor(z/this.cell);
  if(cx===this.lastX&&cz===this.lastZ&&height===this.lastHeight)return;
  this.lastX=cx;this.lastZ=cz;this.lastHeight=height;
  let index=0;
  // Nested, aligned grids keep the horizon block-built without millions of cubes.
  const anchorX=Math.floor(x/32)*32,anchorZ=Math.floor(z/32)*32;
  for(const cell of [2,8,32])for(let j=0;j<this.width;j++)for(let i=0;i<this.width;i++){
   const ox=(i-this.width/2+.5)*cell,oz=(j-this.width/2+.5)*cell;
   if(cell>2&&Math.abs(ox)<this.width*cell/8&&Math.abs(oz)<this.width*cell/8)continue;
   const wx=anchorX+ox,wz=anchorZ+oz,top=Math.ceil(height(wx,wz)/.5)*.5;
   this.matrix.makeScale(cell,32,cell);
   this.matrix.setPosition(wx,top-16,wz);this.root.setMatrixAt(index,this.matrix);
   const band=((Math.floor(top*2)%4)+4)%4;this.color.setHSL(.095,.36,.51+band*.035);this.root.setColorAt(index++,this.color);
  }
  this.root.count=index;
  this.root.instanceMatrix.needsUpdate=true;this.root.instanceColor.needsUpdate=true;
 }
}
