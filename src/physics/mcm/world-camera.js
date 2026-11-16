import assert from './captured-invariants.js';
import {CapturedBytes} from './captured-bytes.js';
import {connectMcmWorldChase} from './world-chase.js';
import {decodeChaseFrameMemory} from '../../../scripts/mcm-reference/chase-frame-memory.mjs';
import {connectWorldCameraVisibility} from '../../../scripts/mcm-reference/world-camera-visibility.mjs';

// Initialize the shared chase camera and mesh visibility aliases once. This
// factory accepts only the atomic starting snapshot, never later observations.
export function connectMcmWorldCamera(runtime,raw,terrain){
 const initial=decodeChaseFrameMemory(raw);
 assert.equal(raw.phase,'world-entry');assert.equal(raw.frame,0);
 assert.equal(raw.deltaBits,runtime.world.entry.dtBits);
 assert.equal(raw.camera,runtime.world.entry.view,'Camera/world checkpoint identity differs');
 assert.equal(raw.blocks.find(b=>b.address===runtime.world.entry.world)?.hex,runtime.world.entry.worldHex,'Camera/world checkpoint bytes differ');
 const block=address=>{
  const b=raw.blocks.find(b=>b.address===address);
  assert.ok(b,'Missing initial camera memory');return CapturedBytes.from(b.hex,'hex');
 };
 const cameraBytes=block(raw.camera),target=cameraBytes.readUInt32LE(0x1ec),bike=runtime.bikes.get(target);
 assert.ok(bike,'Camera target is outside retained bikes');
 const bikeBytes=block(target),riderAddress=bikeBytes.readUInt32LE(0x874),riderPointAddress=block(riderAddress).readUInt32LE(0xfc);
 const riderPoint=bike.loaded.visuals.nodes.get(riderPointAddress);
 assert.ok(riderPoint,'Missing retained crash-camera rider point');
 assert.equal(block(target).toString('hex'),runtime.world.bikes.find(b=>b.address===target).artifacts.bike.blocks.find(b=>b.address===target).hex,'Camera/bike checkpoint bytes differ');
 const retained=connectMcmWorldChase(runtime,initial,terrain,{target,riderPoint});
 const rootPointer=bikeBytes.readUInt32LE(0xc8c)+0x434;
 const rootBlock=raw.blocks.find(b=>rootPointer>=b.address&&rootPointer+4<=b.address+b.hex.length/2);
 assert.ok(rootBlock,'Missing camera rider visibility root');
 const renderRoot=CapturedBytes.from(rootBlock.hex,'hex').readUInt32LE(rootPointer-rootBlock.address);
 const visibility=connectWorldCameraVisibility(runtime.meshes,[bikeBytes.readUInt32LE(0x434),renderRoot],[initial.nodeVisibility[0],initial.nodeVisibility[9]],()=>retained.state);
 return {address:raw.camera,target,initial,bike,riderPoint,retained,visibility};
}
