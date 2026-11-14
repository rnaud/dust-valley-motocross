import {loadLiveFrameActions} from './live-frame-actions.mjs';
import {checkpointMemory} from './live-checkpoint.mjs';

// Captured dependencies for 0x4b0610. This does not emulate device polling;
// queryReset reads the action state observed at the same frame boundary.
export function loadLiveFrameEnvironment(checkpoint,observation){
 if(observation?.kind!=='mcm-frame-environment-observation'||
    !/^[0-9a-f]{16}$/.test(observation.captureId??'')||observation.captureId!==checkpoint.captureId||
    observation.captureBoundary!=='player-frame-entry'||checkpoint.captureBoundary!==observation.captureBoundary||
    observation.playerFrame!==checkpoint.playerFrame||observation.bikeAddress!==checkpoint.bikeAddress)throw Error('Frame environment boundary differs');
 const local=checkpointMemory(checkpoint),memory=checkpointMemory({...observation,kind:'mcm-partial-local-checkpoint'}),bike=checkpoint.bikeAddress;
 for(const a of checkpoint.blocks)for(const b of observation.blocks){
  const start=Math.max(a.address,b.address),end=Math.min(a.address+a.size,b.address+b.size);
  if(start<end&&!local.read(start,end-start).equals(memory.read(start,end-start)))throw Error('Frame environment checkpoint bytes differ');
 }
 const world=memory.u32(0x4e4fb4),owner=local.u32(bike+0xc84),controller=local.u32(bike+0x6e4);
 const flags=memory.read(world+0x1070,4),used=[0x4e4fb4,world+0x1070,owner+0x18bc];
 let device=0,resetAction=null;
 if(controller){device=memory.u32(controller+0x24);resetAction=memory.u32(device+0x3b4);used.push(controller+0x24,device+0x3b4);}
 let input=null;
 if(observation.inputCaptured){
  const steeringDevice=memory.u32(world+0x12e4);
  used.push(world+0x12d4,world+0x12e4,world+0x12e8,world+0x12fc);
  let deviceByte=null,deviceKind=null;
  if(steeringDevice){deviceKind=memory.u32(steeringDevice+0x30);deviceByte=memory.read(steeringDevice+0x5c,4).readUInt8(1);used.push(steeringDevice+0x30,steeringDevice+0x5c);}
  input={analogBits:memory.u32(world+0x12fc),longitudinalBits:memory.u32(world+0x12e8),steerBits:memory.u32(world+0x12d4),devicePresent:!!steeringDevice,deviceByte,deviceKind};
 }
 let terrainMode=null;
 if(observation.eventsCaptured){const address=local.u32(bike+0x8f4)+0x954;terrainMode=memory.u32(address);used.push(address);}
 let resetSupport=null;
 if(observation.resetSupportCaptured){
  const observer=memory.u32(world+0x608);
  used.push(world+0x314,world+0x1078,world+0x608);
  if(observer)used.push(observer+0x80);
  resetSupport={playerCount:memory.u32(world+0x314),aiCount:memory.read(world+0x1078,4).readInt16LE(2),observerBikeAddress:observer?memory.u32(observer+0x80):0};
  used.push(world+0x614);resetSupport.enumerationDisabled=!!memory.u32(world+0x614);
  resetSupport.bikes=[];
  if(!resetSupport.enumerationDisabled){
   if(resetSupport.playerCount!==1||resetSupport.aiCount<0||resetSupport.aiCount>64)throw Error('Unsupported reset bike enumeration');
   used.push(owner+0x30,owner+0x38);
   const list=memory.u32(owner+0x38),addresses=[memory.u32(owner+0x30)];
   if(list)for(let i=0;i<resetSupport.aiCount;i++){used.push(list+i*4);addresses.push(memory.u32(list+i*4));}
   for(const address of addresses){used.push(address+0xc30);resetSupport.bikes.push({address,fieldc30:memory.u32(address+0xc30)});}
  }
 }
 const actions=observation.actionsCaptured?loadLiveFrameActions(memory,controller,used):null;
 if(observation.blocks.length!==new Set(used).size||observation.blocks.some(b=>b.size!==4||!used.includes(b.address)))throw Error('Unexpected frame environment blocks');
 return {worldAddress:world,ownerAddress:owner,controllerAddress:controller,deviceAddress:device,resetAction,input,actions,terrainMode,resetSupport,
  resetDecision:{setting:flags.readUInt16LE(0),mode:flags.readUInt16LE(2),worldScale:memory.f32(owner+0x18bc),controllerPresent:!!controller,queryReset:()=>resetAction===1},memory};
}
