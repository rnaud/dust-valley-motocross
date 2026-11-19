import {Color,InstancedBufferAttribute,PointsNodeMaterial,Sprite,AdditiveBlending,NormalBlending} from 'three/webgpu';
import {instancedBufferAttribute,texture,uniform,vec4} from 'three/tsl';

// WebGPU draws THREE.Points one pixel wide. Sized, textured points are
// instanced camera-facing sprites: one draw, per-instance position/size/alpha.
// size follows PointsMaterial units: with attenuation, pixels = size·(H/2)/depth.
export function createSizedPoints({count,map,color='#ffffff',opacity=1,size=1,sizeAttenuation=true,additive=false,depthWrite=false}){
 const positions=new Float32Array(count*3).fill(-1e4),sizes=new Float32Array(count).fill(size),alphas=new Float32Array(count).fill(1);
 const attributes=[new InstancedBufferAttribute(positions,3),new InstancedBufferAttribute(sizes,1),new InstancedBufferAttribute(alphas,1)];
 const material=new PointsNodeMaterial({transparent:true,depthWrite,sizeAttenuation,blending:additive?AdditiveBlending:NormalBlending});
 const tint=uniform(new Color(color)),alpha=uniform(opacity),sprite=texture(map);
 material.positionNode=instancedBufferAttribute(attributes[0]);material.sizeNode=instancedBufferAttribute(attributes[1]);
 material.colorNode=vec4(tint,1);material.opacityNode=sprite.a.mul(instancedBufferAttribute(attributes[2])).mul(alpha);
 const object=new Sprite(material);object.count=count;object.frustumCulled=false;
 return {object,material,positions,sizes,alphas,tint,alpha,update(){for(const a of attributes)a.needsUpdate=true;}};
}
