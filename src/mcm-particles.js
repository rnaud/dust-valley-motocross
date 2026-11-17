import * as THREE from 'three';
// Presentation only: read retained native slots; never tick, sort or write them.
// Procedural sprite masks stand in for the original particle texture atlas.
export class McmParticles{
 constructor(){
  const g=new THREE.InstancedBufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));g.setIndex([0,1,2,0,2,3]);
  this.centers=new Float32Array(3000);this.colors=new Float32Array(4000);this.sizes=new Float32Array(1000);this.sprites=new Float32Array(1000);
  for(const [name,array,size]of [['center',this.centers,3],['tint',this.colors,4],['radius',this.sizes,1],['sprite',this.sprites,1]])g.setAttribute(name,new THREE.InstancedBufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
  g.instanceCount=0;
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`attribute vec3 center;attribute vec4 tint;attribute float radius,sprite;varying vec2 corner;varying vec4 rgba;varying float kind;void main(){corner=position.xy;rgba=tint;kind=sprite;vec4 v=modelViewMatrix*vec4(center,1.);v.xy+=position.xy*radius;gl_Position=projectionMatrix*v;}`,fragmentShader:`varying vec2 corner;varying vec4 rgba;varying float kind;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float r=length(corner);float wisps=.82+.18*sin(corner.x*11.+kind)*sin(corner.y*9.-kind);float alpha=pow(max(0.,1.-r*r),2.)*wisps;if(kind>12.)alpha=(1.-smoothstep(.15,.75,r))*(.65+.35*hash(floor(corner*8.)));alpha*=rgba.a;if(alpha<.012)discard;gl_FragColor=vec4(rgba.rgb,alpha);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`.replace(';#include',';\n#include')});
  this.root=new THREE.Mesh(g,m);this.root.name='mcm-recovered-particles';this.root.frustumCulled=false;this.count=0;this.nativeCount=0;this.rows=[];
 }
 update(state,camera,alpha=1){
  const physics=state.physics,pool=physics?.shared?.particles?.pool??physics?.runtime?.external?.pool;
  this.rows.length=0;this.nativeCount=pool?.count??0;
  if(state.physicsBackend==='recovered-core'&&pool){
   camera.updateMatrixWorld();const e=camera.matrixWorldInverse.elements;
   for(let i=0;i<Math.min(pool.count,1000);i++){
    const p=pool.particle(i),f=o=>p.getFloat32(o,true),flags=p.getUint32(0x34,true),age=f(0x14),life=f(0x18),radius=f(0x1c)*.3048;
    if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(age)||life<=0||age>life)continue;
    const lag=(flags&4)?(1-alpha)*.02:0,point=physics.position([f(0)-(lag?f(0x38)*lag:0),f(4)-(lag?f(0x3c)*lag:0),f(8)-(lag?f(0x40)*lag:0)]);
    if(!Number.isFinite(point.x+point.y+point.z))continue;
    const color=p.getUint32(0xc,true),fade=flags&2?Math.max(0,1-age/life):1;
    this.rows.push({point,radius,color:flags&1?0xd6ba8b:color,fade,sprite:p.getUint32(0x10,true),depth:e[2]*point.x+e[6]*point.y+e[10]*point.z+e[14]});
   }
   this.rows.sort((a,b)=>a.depth-b.depth);
  }
  this.count=this.rows.length;this.root.geometry.instanceCount=this.count;
  this.rows.forEach((r,i)=>{this.centers.set([r.point.x,r.point.y,r.point.z],i*3);const color=new THREE.Color(r.color);this.colors.set([color.r,color.g,color.b,r.fade*.72],i*4);this.sizes[i]=r.radius;this.sprites[i]=r.sprite;});
  for(const a of Object.values(this.root.geometry.attributes))if(a.isInstancedBufferAttribute)a.needsUpdate=true;
 }
}
