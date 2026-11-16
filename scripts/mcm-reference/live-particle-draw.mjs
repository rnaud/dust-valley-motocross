import {createMcmParticleUvTail} from '../../src/physics/mcm/particle-uv-tail.js';
import {buildMcmParticleQuads} from '../../src/physics/mcm/particle-quads.js';
import {projectWineParticleCenters} from '../../src/physics/mcm/particle-projection.js';
import assert from 'node:assert/strict';
import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
import {updateMcmParticleVisibility} from '../../src/physics/mcm/particle-visibility.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';
// New captures supply device matrices, from which projection is computed.
// Legacy captures explicitly retain their observed-projection input boundary.
export function prepareLiveParticleDraw(external,event){
 const {pool,poolBytes}=external;
 assert.equal(event.yOffsetBits,0x3f000000,'Original particle Y offset');
 assert.equal(event.inputAddress,poolBytes.readUInt32LE(0x1f90),'Particle input buffer identity');
 assert.equal(event.projectedAddress,poolBytes.readUInt32LE(0x1f8c),'Particle projection buffer identity');
 const input=CapturedBytes.from(event.inputHex,'hex');assert.equal(input.length,pool.count*32,'Particle draw count');
 for(let i=0;i<pool.count;i++){
  const p=pool.particle(i);input.writeUInt32LE(p.getUint32(0,true),i*32);
  input.writeFloatLE(p.getFloat32(4,true)+.5,i*32+4);input.writeUInt32LE(p.getUint32(8,true),i*32+8);
  p.setUint32(0x44,event.projectedAddress+i*32,true);
 }
 poolBytes.writeUInt32LE(0,0x34);return input;
}
export function cullLiveParticleDraw(external,event,input){
 const {pool,poolBytes}=external;let projected;
 if(event.projectionMatricesHex!==undefined){
  assert.ok(input,'Missing computed particle positions');assert.ok(Number.isInteger(event.projectionViewport)&&event.projectionViewport>0,'Missing particle viewport identity');assert.equal(event.projectionViewport,event.currentViewport,'Temporary device viewport is not captured');
  const bytes=CapturedBytes.from(event.projectionMatricesHex,'hex');assert.equal(bytes.length,192,'Particle device matrices');
  const matrices=Array.from({length:3},(_,j)=>Array.from({length:16},(_,i)=>bytes.readFloatLE(j*64+i*4)));
  projected=CapturedBytes.from(projectWineParticleCenters(input.view(0,input.length),matrices,event.viewport));
  assert.equal(projected.toString('hex'),event.projectedHex,'Computed particle projection');
 }else projected=CapturedBytes.from(event.projectedHex,'hex');
 assert.equal(projected.length,pool.count*32,'Particle projected count');
 assert.equal(event.projectedAddress,poolBytes.readUInt32LE(0x1f8c),'Particle projection buffer identity');
 const camera={scale:bitsFloat(event.scaleBits),width:event.width,height:event.height};
 assert.ok(Number.isInteger(camera.width)&&Number.isInteger(camera.height),'Particle viewport dimensions');
 poolBytes.writeUInt32LE(0,0x34);
 for(let i=0;i<pool.count;i++)if(updateMcmParticleVisibility(pool.particle(i),projected.view(i*32,32),camera)){
  const count=poolBytes.readUInt32LE(0x34);poolBytes.writeUInt32LE(poolBytes.readUInt32LE(0x44+i*4),0xfe4+count*4);poolBytes.writeUInt32LE(count+1,0x34);
 }
 external.particleDrawProjection=projected;return poolBytes.readUInt32LE(0x34);
}

export function generateLiveParticleQuads(external,before,after){
 const {pool,poolBytes,particleDrawProjection:projected}=external;
 assert.ok(projected,'Missing computed particle projection');
 const count=poolBytes.readUInt32LE(0x34);assert.ok(count>0,'Empty particle draw tail');
 for(const key of ['diffuseSeed','renderFlags','textureFormat','viewDepthHex','fogHex','uvHex'])assert.equal(after[key],before[key],`Particle quad input changed: ${key}`);
 const depth=CapturedBytes.from(before.viewDepthHex,'hex'),fog=CapturedBytes.from(before.fogHex,'hex'),capturedUv=CapturedBytes.from(before.uvHex,'hex');assert.equal(depth.length,16);assert.equal(fog.length,8);assert.equal(capturedUv.length,0x5a0);
 const uv=CapturedBytes.from(Buffer.concat([Buffer.from(before.uvHex,'hex'),Buffer.from(createMcmParticleUvTail().buffer)]));
 const byAddress=new Map(Array.from({length:pool.count},(_,i)=>[poolBytes.readUInt32LE(0x44+i*4),i]));
 const addresses=Array.from({length:count},(_,i)=>poolBytes.readUInt32LE(0xfe4+i*4));
 const indices=addresses.map(a=>{assert.ok(byAddress.has(a),'Unknown visible particle');return byAddress.get(a);});
 for(const i of indices){const sprite=pool.particle(i).getUint32(0x10,true);assert.ok(sprite*32+32<=uv.length,`Uncaptured particle UV entry: sprite=${sprite}, entries=${uv.length/32}, completedBikeFrames=${before.completedBikeFrames}`);}
 const output=new CapturedBytes(count*128);
 const order=buildMcmParticleQuads(indices.map(i=>pool.particle(i)),indices.map(i=>projected.view(i*32,32)),{flags:before.renderFlags,seed:before.diffuseSeed,near:fog.readFloatLE(0),far:fog.readFloatLE(4),viewDepth:[0,1,2,3].map(i=>depth.readFloatLE(i*4)),uv:uv.view(0,uv.length)},output.view(0,output.length));
 order.forEach((i,j)=>poolBytes.writeUInt32LE(addresses[i],0xfe4+j*4));
 assert.equal(output.toString('hex'),after.quadHex,'Computed particle quad vertices');return {visible:count,vertexWords:count*32};
}
