import {tickMcmImpactParticles} from '../../src/physics/mcm/impact-particle-tick.js';
import {tickMcmDust} from '../../src/physics/mcm/dust-tick.js';
import {tickMcmSpray} from '../../src/physics/mcm/spray-tick.js';
import {tickMcmExhaust} from '../../src/physics/mcm/exhaust-tick.js';

// Retain emitter tables once. Frame-tail writes and emitter updates share the
// live header; copying that header here never consumes a native output row.
export function connectWorldEmitterRuntime(runtime){
 const emitters=new Map();
 for(const source of runtime.world.bikes){
  const live=runtime.bikes.get(source.address).loaded.context.frameEffects.emitters;
  live.forEach((emitter,index)=>{
   const update=[0x438e10,0x4393d0,0x43a6d0][index];
   const node=runtime.world.tree.nodes.get(emitter.address);
   if(!node||node.update!==update)throw Error('World emitter actor differs');
   const bytes=index===1?Buffer.from(source.artifacts.child.sprayHex,'hex'):emitter.bytes;
   if(index===1&&(source.artifacts.child.sprayAddress!==emitter.address||bytes.length!==0x614))throw Error('Missing initial spray allocation');
   if(bytes.readUInt32LE(0x34)!==runtime.particles.address)throw Error('Emitter shared pool differs');
   emitters.set(emitter.address,{emitter,bytes,update,tick:[tickMcmDust,tickMcmSpray,tickMcmExhaust][index]});
  });
  const body=source.artifacts.bike.blocks.find(b=>b.address===source.address);
  const impactAddress=Buffer.from(body.hex,'hex').readUInt32LE(0xc9c),node=runtime.world.tree.nodes.get(impactAddress);
  if(node?.stateBytes){
   if(node.update!==0x439a30||node.stateBytes.length!==0x610)throw Error('Impact emitter allocation differs');
   const bytes=node.boundaryWords?Buffer.alloc(0x618):node.stateBytes;
   if(node.boundaryWords){node.stateBytes.copy(bytes);node.boundaryWords.forEach((word,j)=>bytes.writeUInt32LE(word,0x610+j*4));}
   node.stateBytes=bytes.subarray(0,0x610);
   if(bytes.readUInt32LE(0x34)!==runtime.particles.address)throw Error('Impact emitter pool differs');
   emitters.set(impactAddress,{emitter:{bytes},bytes,update:node.update,tick:tickMcmImpactParticles});
   const c=runtime.bikes.get(source.address).loaded.context;
   runtime.ordered.actors.get(source.address).emitCollisionEffect=(point,velocity)=>{
    if(!c.bike.fieldc90||!c.frameEffects.enabled)return;
    bytes.copy(bytes,0x54,0x48,0x54);
    point.forEach((v,j)=>bytes.writeFloatLE(v,0x48+j*4));
    velocity.forEach((v,j)=>bytes.writeFloatLE(v,0x7c+j*4));
    bytes.writeUInt32LE(1,0x64);
   };
  }
 }
 return {
  emitters,
  step(node,dt,paused,observe=()=>{}){
   const state=emitters.get(node.address);if(!state)return false;
   if(node.update!==state.update)throw Error('Emitter update changed');
   const {bytes,emitter,tick}=state;
   if(bytes!==emitter.bytes)bytes.set(emitter.bytes);
   observe('before',state);
   tick(new DataView(bytes.buffer,bytes.byteOffset,bytes.length),{dt,paused,pool:runtime.particles.pool});
   if(bytes!==emitter.bytes)emitter.bytes.set(bytes.subarray(0,emitter.bytes.length));
   observe('after',state);
   return true;
  }
 };
}
