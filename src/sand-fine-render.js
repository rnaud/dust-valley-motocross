import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {cameraPosition,cameraViewMatrix,dot,float,floor,fract,length,max,min,mix,mod,normalize,positionGeometry,pow,select,sin,smoothstep,step,texture,uniform,varying,vec2,vec3,vec4} from 'three/tsl';
import {FINE_CELL} from './sand-fine-gpu.js';
import {soilUniforms} from './textures.js';

// Bilinear height of the coarse GPU sand field (h + r) at a world xz, matching
// SandFlowGPU.heightAt on the CPU. Vertex-stage safe (explicit level 0).
export function coarseFieldHeight(xz){return coarseFieldSample(xz).x;}
// Height and slope (dh/dx, dh/dz) from the same four bilinear samples.
export function coarseFieldSample(xz){
 const U=soilUniforms,n=float(1).div(U.flowTexel),t=xz.add(450).div(900).mul(n).sub(.5),i=floor(t),f=fract(t);
 const at=o=>{const c=U.flowField.sample(i.add(o).add(.5).div(n)).level(0);return c.x.add(c.y);};
 const a=at(vec2(0,0)),b=at(vec2(1,0)),c=at(vec2(0,1)),d=at(vec2(1,1)),perMetre=n.div(900);
 return vec3(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(b.sub(a),d.sub(c),f.y).mul(perMetre),mix(c.sub(a),d.sub(b),f.x).mul(perMetre));
}

// The sand surface near the bike, drawn straight from the simulation: one
// vertex per 25 cm node of the fine field. Height = coarse field + fine detail
// (faded to zero over the window edge so it meets the coarse ground); the
// normal comes from neighbouring nodes, so ripples, ruts and berms are real
// geometry. Sand colour is a single albedo, varied only by simulation state
// (fresh sand paler, packed ruts darker); non-sand ground keeps the map paint.
export function createFineSandMesh(fine,{albedo='#e2c79e',soilMap}){
 const n=fine.n,positions=new Float32Array(n*n*3),indices=new Uint32Array((n-1)*(n-1)*6);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++)positions.set([i,0,j],(j*n+i)*3);
 let k=0;for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+1,c=a+n,d=c+1;indices.set([a,c,b,b,c,d],k);k+=6;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setIndex(new THREE.BufferAttribute(indices,1));
 geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1e6);
 const state=texture(fine.texture),albedoU=uniform(new THREE.Color(albedo)),soil=texture(soilMap??new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1));
 const local=positionGeometry.xz,node=fine.origin.add(local),edge=min(min(local.x,local.y),min(float(n-1).sub(local.x),float(n-1).sub(local.y)));
 const fade=smoothstep(0,24,edge);
 const cellAt=o=>state.sample(mod(node.add(o),n).add(.5).div(n)).level(0);
 const here=cellAt(vec2(0,0)),world=node.mul(FINE_CELL);
 // 9 texture reads per vertex: coarse height+slope (4) and fine node + 4 neighbours.
 const coarse=coarseFieldSample(world),detail=c=>c.x.mul(fade).add(c.w),dE=detail(cellAt(vec2(1,0))),dW=detail(cellAt(vec2(-1,0))),dN=detail(cellAt(vec2(0,1))),dS=detail(cellAt(vec2(0,-1)));
 const slopeX=coarse.y.add(dE.sub(dW).div(FINE_CELL*2)),slopeZ=coarse.z.add(dN.sub(dS).div(FINE_CELL*2));
 const normal=varying(normalize(vec3(slopeX.negate(),1,slopeZ.negate()))),sim=varying(vec3(here.y,here.z,fade));
 const material=new MeshStandardNodeMaterial({roughness:.93,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 material.positionNode=vec3(world.x,coarse.x.add(here.x.mul(fade)).add(here.w),world.y);
 material.normalNode=normalize(cameraViewMatrix.mul(vec4(normal,0)).xyz);
 // Map paint (alpha = sandiness) only for rock and soil; sand is texture-free.
 const paint=soil.sample(vec2(world.x.add(450).div(900),float(1).sub(world.y.add(450).div(900)))),sandiness=paint.a;
 const sand=albedoU.mul(float(1).add(sim.y.mul(.07))).mul(float(1).sub(sim.x.mul(.13)));
 material.colorNode=vec4(mix(paint.rgb,sand,sandiness),1);
 // Sun glints from the simulated surface normal, only on sun-facing sand.
 const P=vec3(world.x,0,world.y),cell=floor(world.mul(4*24/4)),hash=fract(sin(dot(cell,vec2(12.9898,78.233))).mul(43758.5453));
 const facet=normalize(normal.add(vec3(fract(hash.mul(37)),fract(hash.mul(91)),fract(hash.mul(53))).sub(.5).mul(1.1)));
 const halfVector=normalize(soilUniforms.sunDir.add(normalize(cameraPosition.sub(P))));
 const glint=pow(max(dot(facet,halfVector),0),48).mul(step(.986,hash)).mul(smoothstep(0,.15,dot(normal,soilUniforms.sunDir)));
 material.emissiveNode=vec3(1,.94,.82).mul(glint).mul(soilUniforms.sparkle).mul(sandiness).mul(float(1).sub(smoothstep(14,40,length(cameraPosition.sub(P))))).mul(2);
 const mesh=new THREE.Mesh(geo,material);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='fine-sand';mesh.visible=false;
 return {mesh,state,albedo:albedoU,soil,update(){state.value=fine.texture;}};
}
