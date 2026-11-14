import {checkpointMemory} from './live-checkpoint.mjs';
import {loadLiveFrameEnvironment} from './live-frame-environment.mjs';
function prepare(checkpoint,observation){
 const env=loadLiveFrameEnvironment(checkpoint,observation);if(!env.actions)throw Error('Action observation required');
 const blocks=[...checkpoint.blocks,...observation.blocks];checkpointMemory({...checkpoint,blocks,blockCount:blocks.length});
 return {actions:env.actions,blocks};
}
export function encodeLiveFrameActionsInput(checkpoint,observation){
 const {blocks}=prepare(checkpoint,observation),header=Buffer.alloc(8);header.writeUInt32LE(checkpoint.bikeAddress);header.writeUInt32LE(blocks.length,4);
 return Buffer.concat([header,...blocks.flatMap(b=>{const h=Buffer.alloc(8);h.writeUInt32LE(b.address);h.writeUInt32LE(b.size,4);return [h,Buffer.from(b.hex,'hex')];})]);
}
export function compareLiveFrameActions(checkpoint,observation,output){
 const {actions,blocks}=prepare(checkpoint,observation);
 if(output.length!==24+blocks.reduce((n,b)=>n+b.size,0))throw Error('Wrong original action output size');
 const differences=[];let comparedWords=6,cursor=24,changedWords=0;
 for(let action=4;action<=9;action++)if(actions[action]!==output.readUInt32LE((action-4)*4))differences.push({action,original:output.readUInt32LE((action-4)*4),recovered:actions[action]});
 for(const b of blocks){const before=Buffer.from(b.hex,'hex');for(let i=0;i<b.size;i+=4){comparedWords++;if(before.readUInt32LE(i)!==output.readUInt32LE(cursor+i)){changedWords++;differences.push({address:b.address+i,original:output.readUInt32LE(cursor+i),recovered:before.readUInt32LE(i)});}}cursor+=b.size;}
 return {scope:'Original 0x454f70 option-zero logical actions 4–9 with captured keyboard/secondary-device mappings and state. Joystick routing is unsupported. No OS polling, full-frame or trajectory parity.',actions,comparedWords,changedWords,differences:differences.length,firstDifferences:differences.slice(0,20)};
}
