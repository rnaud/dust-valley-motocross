import {checkpointMemory} from './live-checkpoint.mjs';
import {loadLiveFrameEnvironment} from './live-frame-environment.mjs';
import {decideMcmFrameReset} from '../../src/physics/mcm/frame-reset-decision.js';
function prepare(checkpoint,observation){
 const environment=loadLiveFrameEnvironment(checkpoint,observation),m=checkpointMemory(checkpoint),a=checkpoint.bikeAddress,bike={};
 for(const o of [0x88c,0x844,0x8b0,0x884,0xc40])bike[`field${o.toString(16)}`]=m.u32(a+o);
 for(const o of [0xbd8,0x87c,0x894,0x564,0x590,0x594])bike[`field${o.toString(16)}`]=m.f32(a+o);
 bike.position=[0,4,8].map(o=>m.f32(a+0x4f8+o));
 if(bike.field844||bike.field88c)throw Error('Unsupported live reset state: rider cleanup not connected');
 const blocks=[...checkpoint.blocks,...observation.blocks];checkpointMemory({...checkpoint,blocks,blockCount:blocks.length});
 return {context:{bike,resetDecision:environment.resetDecision},blocks};
}
export function encodeLiveFrameResetInput(checkpoint,observation){
 const {blocks}=prepare(checkpoint,observation),header=Buffer.alloc(8);header.writeUInt32LE(checkpoint.bikeAddress);header.writeUInt32LE(blocks.length,4);
 return Buffer.concat([header,...blocks.flatMap(b=>{const h=Buffer.alloc(8);h.writeUInt32LE(b.address);h.writeUInt32LE(b.size,4);return [h,Buffer.from(b.hex,'hex')];})]);
}
export function compareLiveFrameReset(checkpoint,observation,output){
 const {context,blocks}=prepare(checkpoint,observation),expected=blocks.map(b=>({...b,bytes:Buffer.from(b.hex,'hex')}));
 if(output.length!==4+blocks.reduce((n,b)=>n+b.size,0))throw Error('Wrong original reset output size');
 const result=decideMcmFrameReset(context,.02),bike=expected.find(b=>b.address===checkpoint.bikeAddress);
 for(const o of [0x844,0x8b0,0x884,0xc40])bike.bytes.writeUInt32LE(context.bike[`field${o.toString(16)}`]>>>0,o);
 let differences=+(result.code!==output.readUInt32LE()),comparedWords=1,changedWords=0,cursor=4;const firstDifferences=[];
 if(differences)firstDifferences.push({result:true,original:output.readUInt32LE(),recovered:result.code});
 for(const b of expected){const before=Buffer.from(b.hex,'hex');for(let i=0;i<b.size;i+=4){const original=output.readUInt32LE(cursor+i),recovered=b.bytes.readUInt32LE(i);comparedWords++;if(original!==before.readUInt32LE(i))changedWords++;if(original!==recovered){differences++;if(firstDifferences.length<20)firstDifferences.push({address:b.address,offset:i,original,recovered});}}cursor+=b.size;}
 return {scope:'Original 0x4b0610 reset decision with captured world settings and unmodified 0x4526d0 action lookup. Normal state only; no rider cleanup, device polling or whole-frame parity.',branch:result.branch,queries:result.queries,blocks:blocks.length,comparedWords,changedWords,differences,firstDifferences};
}
