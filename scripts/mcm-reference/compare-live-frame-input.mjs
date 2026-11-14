import {checkpointMemory} from './live-checkpoint.mjs';
import {loadLiveFrameEnvironment} from './live-frame-environment.mjs';
import {prepareMcmFrameInput} from '../../src/physics/mcm/frame-input.js';
import {floatBits} from '../../src/physics/mcm/math.js';
function prepare(checkpoint,observation){
 const environment=loadLiveFrameEnvironment(checkpoint,observation),m=checkpointMemory(checkpoint),a=checkpoint.bikeAddress,bike={};
 if(!environment.input)throw Error('Frame inputs were not captured');
 for(const o of [0x844,0x814,0x710,0x714,0x614,0xc68,0xb04,0xb08])bike[`field${o.toString(16)}`]=m.u32(a+o);
 bike.field6f8=m.f32(a+0x6f8);
 if(bike.field844||bike.field614||bike.fieldc68)throw Error('Unsupported non-player input state');
 const blocks=[...checkpoint.blocks,...observation.blocks];checkpointMemory({...checkpoint,blocks,blockCount:blocks.length});
 return {context:{bike,frameEntry:{},frameRider:{riderAnimation:{stopped:m.u32(m.u32(a+0xc8c)+4)}}},input:environment.input,blocks};
}
export function encodeLiveFrameInput(checkpoint,observation){
 const {blocks}=prepare(checkpoint,observation),header=Buffer.alloc(8);header.writeUInt32LE(checkpoint.bikeAddress);header.writeUInt32LE(blocks.length,4);
 return Buffer.concat([header,...blocks.flatMap(b=>{const h=Buffer.alloc(8);h.writeUInt32LE(b.address);h.writeUInt32LE(b.size,4);return [h,Buffer.from(b.hex,'hex')];})]);
}
export function compareLiveFrameInput(checkpoint,observation,output){
 const {context,input,blocks}=prepare(checkpoint,observation),expected=blocks.map(b=>({...b,bytes:Buffer.from(b.hex,'hex')}));
 if(output.length!==4+blocks.reduce((n,b)=>n+b.size,0))throw Error('Wrong original input output size');
 const result=prepareMcmFrameInput(context,input),bike=expected.find(b=>b.address===checkpoint.bikeAddress);
 for(const o of [0x710,0x714,0xb04,0xb08])bike.bytes.writeUInt32LE(context.bike[`field${o.toString(16)}`]>>>0,o);
 for(const o of [0x6ec,0x6e8,0x6f4,0x6f0])bike.bytes.writeUInt32LE(floatBits(context.bike[`field${o.toString(16)}`]),o);
 const analog=floatBits(context.frameEntry.analog);let differences=+(analog!==output.readUInt32LE()),comparedWords=1,changedWords=0,cursor=4;const firstDifferences=[];
 if(differences)firstDifferences.push({analog:true,original:output.readUInt32LE(),recovered:analog});
 for(const b of expected){const before=Buffer.from(b.hex,'hex');for(let i=0;i<b.size;i+=4){const original=output.readUInt32LE(cursor+i),recovered=b.bytes.readUInt32LE(i);comparedWords++;if(original!==before.readUInt32LE(i))changedWords++;if(original!==recovered){differences++;if(firstDifferences.length<20)firstDifferences.push({address:b.address,offset:i,original,recovered});}}cursor+=b.size;}
 return {scope:'Original player-input slice 0x4a5672..0x4a57c0 with captured world values and steering-device metadata; no input polling, AI/scripted controller or full-frame parity.',branch:result.branch,blocks:blocks.length,comparedWords,changedWords,differences,firstDifferences};
}
