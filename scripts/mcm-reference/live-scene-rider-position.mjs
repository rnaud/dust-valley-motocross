import {checkpointMemory} from './live-checkpoint.mjs';
import {queryMcmSceneRiderPosition} from '../../src/physics/mcm/scene-rider-position.js';

export function connectLiveSceneRiderPosition(loaded,{checkpoint,aiEnvironment}){
 const a=aiEnvironment?.sceneObjectAddress;
 if(!a)return null;
 if(aiEnvironment.captureId!==checkpoint.captureId||aiEnvironment.captureBoundary!=='ai-frame-entry'||aiEnvironment.bikeAddress!==checkpoint.bikeAddress)throw Error('Scene environment boundary differs');
 const m=checkpointMemory({...aiEnvironment,kind:'mcm-partial-local-checkpoint'}),bike=checkpoint.bikeAddress,initial=checkpointMemory(checkpoint);
 if(m.u32(a)!==0x4d6d64||m.u32(a+0xec)!==bike||m.u32(a+0xf8)!==initial.u32(bike+0x41c))throw Error('Scene object ownership differs');
 const rider=initial.u32(bike+0x874),node=initial.u32(rider+0xfc),riderPoint=loaded.visuals.nodes.get(node);
 if(!riderPoint)throw Error('Scene rider point missing from shared graph');
 const state={enabled:m.u32(m.u32(m.u32(a+0x1c)+4)+0x110),disabled:m.u32(m.u32(m.u32(a+0xf8)+0x48)+0x20),bike:loaded.context.bike,riderPoint};
 return {address:a,state,query:()=>queryMcmSceneRiderPosition(state)};
}
