import * as THREE from 'three';
import {DataTexture,FloatType,HalfFloatType,LinearFilter,NearestFilter,MeshStandardNodeMaterial,NodeMaterial,QuadMesh,RedFormat,RGBAFormat,RenderTarget} from 'three/webgpu';
import {Fn,Loop,clamp,float,max,positionWorld,texture,uniform,uv,vec4} from 'three/tsl';

// Horizon terrain for wild maps: a static height grid out to the map's view
// distance (512² cells, ~13 m on the dunes) with GPU-marched sun shadows, so
// distant dunes shade each other instead of fading into a flat band. The
// centre square (the live 900 m terrain) is left open; its edge tucks under.
export class HorizonTerrain{
 constructor(renderer,map,{size=512,inner=450}={}){
  this.renderer=renderer;this.map=map;this.size=size;
  const extent=this.extent=Math.ceil(map.view.far*2/size)*size,step=this.step=extent/size,half=extent/2,n=size;
  const heights=new Float32Array(n*n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)heights[j*n+i]=map.height(-half+(i+.5)*step,-half+(j+.5)*step);
  // Geometry: one vertex per cell centre; cells fully inside the live square are skipped.
  const positions=new Float32Array(n*n*3),colors=new Float32Array(n*n*3),indices=[],c=new THREE.Color();
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const k=j*n+i,x=-half+(i+.5)*step,z=-half+(j+.5)*step,h=heights[k];
   const e=heights[j*n+Math.min(n-1,i+1)],w=heights[j*n+Math.max(0,i-1)],no=heights[Math.min(n-1,j+1)*n+i],so=heights[Math.max(0,j-1)*n+i];
   const slope=Math.hypot(e-w,no-so)/(2*step),inside=Math.abs(x)<inner&&Math.abs(z)<inner,rgb=map.paint(x,z,h,slope);
   positions.set([x,inside?h-1.5:h,z],k*3);c.setRGB(rgb[0]/255,rgb[1]/255,rgb[2]/255,THREE.SRGBColorSpace);colors.set([c.r,c.g,c.b],k*3);
  }
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){
   const x0=-half+(i+.5)*step,z0=-half+(j+.5)*step;
   if(x0>=-inner&&x0+step<=inner&&z0>=-inner&&z0+step<=inner)continue;
   const a=j*n+i,b=a+1,d=a+n,f=d+1;indices.push(a,d,b,b,d,f);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  // Shadows: march from each cell toward the sun over the height grid.
  const heightTexture=new DataTexture(heights,n,n,RedFormat,FloatType);heightTexture.magFilter=heightTexture.minFilter=NearestFilter;heightTexture.needsUpdate=true;
  this.shadowTarget=new RenderTarget(n,n,{type:HalfFloatType,format:RGBAFormat,minFilter:LinearFilter,magFilter:LinearFilter,depthBuffer:false,generateMipmaps:false});
  this.sunXZ=uniform(new THREE.Vector2(1,0));this.sunTan=uniform(.25);
  const heightNode=texture(heightTexture),shadowMaterial=new NodeMaterial();
  shadowMaterial.fragmentNode=Fn(()=>{
   const p=uv(),h0=heightNode.sample(p).r,occlusion=float(0).toVar();
   Loop({start:1,end:48,type:'int'},({i})=>{
    const k=float(i),d=k.mul(k).mul(.6).add(k.mul(8));
    const excess=heightNode.sample(p.add(this.sunXZ.mul(d.div(extent)))).r.sub(h0.add(d.mul(this.sunTan)).add(1));
    occlusion.assign(max(occlusion,excess.div(d.mul(.025).add(1.5))));
   });
   return vec4(clamp(float(1).sub(occlusion),0,1),0,0,1);
  })();
  this.shadowMaterial=shadowMaterial;this.quad=new QuadMesh(shadowMaterial);
  const shadow=texture(this.shadowTarget.texture),material=new MeshStandardNodeMaterial({vertexColors:true,roughness:1});
  material.receivedShadowNode=Fn(([s])=>s.mul(shadow.sample(positionWorld.xz.add(half).div(extent)).r));
  this.mesh=new THREE.Mesh(geo,material);this.mesh.name='horizon-'+map.id;this.mesh.receiveShadow=true;this.mesh.visible=false;
 }
 // Recompute the horizon shadows for a sun direction (unit, world).
 shade(sun){
  const horizontal=Math.hypot(sun.x,sun.z)||1;this.sunXZ.value.set(sun.x/horizontal,sun.z/horizontal);this.sunTan.value=sun.y/horizontal;
  const r=this.renderer,previous=r.getRenderTarget();r.setRenderTarget(this.shadowTarget);this.quad.render(r);r.setRenderTarget(previous);
 }
}
