import assert from 'node:assert/strict';
import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
import {updateMcmParticleVisibility} from '../../src/physics/mcm/particle-visibility.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';
// Projection remains an explicit device-stage input. Particle and pool outputs
// are computed from retained allocations, never imported from draw observations.
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
export function cullLiveParticleDraw(external,event){
 const {pool,poolBytes}=external,projected=CapturedBytes.from(event.projectedHex,'hex');
 assert.equal(projected.length,pool.count*32,'Particle projected count');
 assert.equal(event.projectedAddress,poolBytes.readUInt32LE(0x1f8c),'Particle projection buffer identity');
 const camera={scale:bitsFloat(event.scaleBits),width:event.width,height:event.height};
 assert.ok(Number.isInteger(camera.width)&&Number.isInteger(camera.height),'Particle viewport dimensions');
 poolBytes.writeUInt32LE(0,0x34);
 for(let i=0;i<pool.count;i++)if(updateMcmParticleVisibility(pool.particle(i),projected.view(i*32,32),camera)){
  const count=poolBytes.readUInt32LE(0x34);poolBytes.writeUInt32LE(poolBytes.readUInt32LE(0x44+i*4),0xfe4+count*4);poolBytes.writeUInt32LE(count+1,0x34);
 }
 return poolBytes.readUInt32LE(0x34);
}
