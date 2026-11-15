import {advanceMcmAiController} from './ai-controller.js';
import {bikeU32,bikeF32,bikeVectors} from './bike-body-layout.js';
import {startMcmAnimation} from './animation-seek.js';
// Bridge owned raw AI state to the retained frame's shared semantic objects.
// The body is initialized once. Subsequent synchronization reads only live
// simulation state; it never accepts observed controller/frame outputs.
export function connectMcmRetainedAiController(c,runtime,environment){
 const b=c.bike,body=runtime.body;
 const uint=[...bikeU32,0xc30,0x8b8,0x8a4,0x878,0x880,0x618,0x72c,0x8a8,0x824,0x8c0,0xc90,0xca4,0xca8,0xcac,0xcb0,0xcb4,0xcbc,0xcc0];
 const floats=[...bikeF32,0x6b4,0x624,0x628,0x62c,8,0x4e8,0x4f0,0x4f4,0x5a8,0x5ac,0x66c,0x670,0x674,0x8d0,0x86c,0x868,0x864,0x890,0x708,0x704,0x71c,0x720,0x728,0x734,0x6e8,0x6ec,0x6f0,0xc7c,0x818,0x81c,0x828,0x82c,0x830,0x834,0x850,0x854,0xcb8];
 const vectors={...bikeVectors,spawnPosition:0xbc0,savedHeading:0x898,boundsMin:0x218,boundsMax:0x224,savedPosition:0x56c};
 for(const o of [0x824])if(!(`field${o.toString(16)}` in b))b[`field${o.toString(16)}`]=body.getUint32(o,true);
 for(const o of [0x6f0,0x81c,0x828,0x82c,0x830,0x834])if(!(`field${o.toString(16)}` in b))b[`field${o.toString(16)}`]=body.getFloat32(o,true);
 // The bike animation bounds live in the bike allocation, not a second copy.
 for(const key of ['boundsMin','boundsMax'])Object.defineProperty(c.frameRider.bikeAnimation,key,{configurable:true,enumerable:true,get:()=>b[key],set:value=>{b[key]=value;}});
 const mapped=new Set([...uint,...floats].map(o=>`field${o.toString(16)}`));
 const sync=(write,target=body)=>{
  for(const key of Object.keys(b))if(/^field[0-9a-f]+$/.test(key)&&!mapped.has(key))throw Error(`Unmapped AI body field ${key}`);
  for(const [list,type] of [[uint,'Uint32'],[floats,'Float32']])for(const o of list){const key=`field${o.toString(16)}`;if(key in b){if(write)target['set'+type](o,b[key],true);else b[key]=target['get'+type](o,true);}}
  for(const [key,o] of Object.entries(vectors))if(key in b)for(let i=0;i<3;i++){if(write)target.setFloat32(o+i*4,b[key][i],true);else b[key][i]=target.getFloat32(o+i*4,true);}
  for(const [key,o] of [['mass',0x558],['inverseMass',0x55c]]){if(write)target.setFloat32(o,b[key],true);else b[key]=target.getFloat32(o,true);}
 };
 const animationWords=(view,animation)=>{
  for(const [o,value] of [[4,animation.stopped],[0x10,animation.record?.token??0],[0x14,animation.frame?.token??0],[0x18,animation.displayedFrame?.token??0],[0x1c,animation.previousFrame?.token??0],[0x20,animation.blendFrame?.token??0],[0x30,animation.field30],[0x2c,animation.blending]])view.setUint32(o,value>>>0,true);
  for(const [o,key] of [[8,'remainder'],[0x24,'blendTime'],[0x28,'blendDuration']])view.setFloat32(o,animation[key],true);
 };
 const bridge={body:runtime.body,runtime,environment,projectBody(){
  const bytes=new Uint8Array(body.byteLength);bytes.set(new Uint8Array(body.buffer,body.byteOffset,body.byteLength));const copy=new DataView(bytes.buffer);sync(true,copy);animationWords(copy,c.frameRider.bikeAnimation);return copy;
 },syncToBody:()=>{sync(true);animationWords(body,c.frameRider.bikeAnimation);animationWords(runtime.proxy,c.frameRider.riderAnimation);},advance(delta){
  bridge.syncToBody();environment.refreshActors?.();c.effect.forEach((value,i)=>runtime.envelope.setFloat32(i*4,value,true));
  const result=advanceMcmAiController(runtime,environment,delta);sync(false);
  if(result.trickSelected!==null&&result.trickSelected!==undefined){
   const i=result.trickSelected;startMcmAnimation(c.frameRider.bikeAnimation,c.frameRider.tricks[0][i]);startMcmAnimation(c.frameRider.riderAnimation,c.frameRider.tricks[1][i]);
   for(let k=0;k<4;k++)c.effect[k]=runtime.envelope.getFloat32(k*4,true);
  }
  const tokens=o=>[o.stopped,o.record?.token??0,o.frame.token,o.field30,o.blending];
  c.loopRider.bikeAnimation=tokens(c.frameRider.bikeAnimation);c.loopRider.riderAnimation=tokens(c.frameRider.riderAnimation);
  return result;
 }};
 c.aiController=bridge;return bridge;
}
