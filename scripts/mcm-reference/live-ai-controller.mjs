import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
import {checkpointMemory} from './live-checkpoint.mjs';
import {connectMcmRetainedAiController} from '../../src/physics/mcm/retained-ai-controller.js';
import {queryMcmTerrainHeight} from '../../src/physics/mcm/terrain-height.js';
import {queryMcmTerrainNormal} from '../../src/physics/mcm/terrain-normal.js';
const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
export function connectLiveAiController(loaded,{checkpoint,aiEnvironment,terrain}){
 if(aiEnvironment?.kind!=='mcm-ai-environment-observation'||!['ai-frame-entry','world-frame-entry'].includes(aiEnvironment.captureBoundary)||checkpoint.captureBoundary!==aiEnvironment.captureBoundary||aiEnvironment.captureId!==checkpoint.captureId||aiEnvironment.bikeAddress!==checkpoint.bikeAddress)throw Error('AI environment boundary differs');
 const m=checkpointMemory(checkpoint),world=checkpointMemory({...aiEnvironment,kind:'mcm-partial-local-checkpoint'}),address=checkpoint.bikeAddress,c=loaded.context;
 for(const a of checkpoint.blocks)for(const b of aiEnvironment.blocks){const start=Math.max(a.address,b.address),end=Math.min(a.address+a.size,b.address+b.size);if(start<end&&!m.read(start,end-start).equals(world.read(start,end-start)))throw Error('AI environment checkpoint bytes differ');}
 const body=view(CapturedBytes.from(m.read(address,0xcc8))),nodes=new Map(),tableAddress=m.u32(address+0xaf4),count=m.u32(address+0xb00),table=Array.from({length:count},(_,i)=>world.u32(tableAddress+i*4));
 for(const pointer of table)nodes.set(pointer,{...Object.fromEntries(['x','y','z','speed'].map((key,i)=>[key,world.f32(pointer+i*4)])),kind:world.u32(pointer+16),speedLimit:world.f32(pointer+20),offsetX:world.f32(pointer+24),offsetZ:world.f32(pointer+28),distance:world.f32(pointer+32),flag:world.u32(pointer+36),next:world.u32(pointer+40)});
 const source=loaded.visuals.nodes.get(m.u32(m.u32(address+0x8d8)));if(!source)throw Error('AI source graph missing');
 const runtime={id:address,body,route:{nodes,table},setup:{graph:{target:c.bodyNode,source,components:c.bounds.components,boundsChildren:c.bounds.children.slice(0,c.bounds.count)},boundsMin:c.bounds.min,boundsMax:c.bounds.max},
  animations:Array.from({length:16},(_,i)=>[c.frameRider.tricks[0][i].token,c.frameRider.tricks[1][i].token,c.frameRider.tricks[0][i].firstFrame.token,c.frameRider.tricks[1][i].firstFrame.token]),proxy:view(CapturedBytes.from(m.read(m.u32(address+0xc8c),0x34))),envelope:view(CapturedBytes.from(m.read(m.u32(address+0x904),16)))};
 const settings=world.u32(0x4e4fb4),owner=m.u32(address+0x41c),actors=new Map();
 const actor=id=>{if(!actors.has(id)){const bytes=world.read(id,0xcc8);if(!bytes.equals(loaded.world.memory.read(id,0xcc8)))throw Error('AI actor collision snapshot differs');actors.set(id,{id,body:id===address?body:view(CapturedBytes.from(bytes))});}return actors.get(id);};
 const player=actor(world.u32(owner+0x30)),firstCount=world.read(settings+0x107a,2).readInt16LE(),secondCount=world.read(settings+0x107e,1)[0];
 if(firstCount<0||firstCount>8||secondCount>8)throw Error('Unvalidated AI allocator actor count');
 const list=(offset,count)=>Array.from({length:count},(_,i)=>actor(world.u32(world.u32(owner+offset)+i*4))),firstActors=list(0x38,firstCount),secondActors=list(0x34,secondCount);
 const playerCount=player.body.getUint32(0xb00,true),playerTable=player.body.getUint32(0xaf4,true);player.routeDistances=Array.from({length:playerCount},(_,i)=>world.f32(world.u32(playerTable+i*4)+32));
 const blocks=new Map();let pointer=0;const heap={calloc(count,size){if(count>8||size!==20)throw Error('Unvalidated AI allocation request');blocks.set(++pointer,Math.max(16,Math.ceil(count*size/16)*16));return pointer;},size(p){if(!blocks.has(p))throw Error('Unknown AI heap block');return blocks.get(p);},free(p){if(p&&!blocks.delete(p))throw Error('Unknown AI heap free');}};
 const environment={mode:world.read(settings+0x1072,2).readUInt16LE(),raceSetting:world.read(settings+0x1070,2).readUInt16LE(),raceContext:world.u32(settings+0x6c0),routeDataLoaded:world.u32(0x4e7240),loadRouteData(){throw Error('AI route loader not connected');},initialProgress:0,
  player,firstActors,secondActors,worldHeight:loaded.environment.resetDecision.worldScale,margin:world.f32(0x4e723c),queryHeight:point=>queryMcmTerrainHeight({...terrain,point}),queryNormal:point=>queryMcmTerrainNormal({...terrain,point,normal:[0,0,0]}),random:loaded.random,heap,accounting:{bytes:world.u32(0x4e5670)},
  refreshActors(){for(const actor of actors.values()){if(actor.id===address)continue;const live=loaded.ordered.actors.get(actor.id);if(!live||live.kind!=='bike')throw Error('Missing shared AI world actor');for(const [offset,values] of [[0x4f8,live.position],[0x510,live.velocity]])values.forEach((value,i)=>actor.body.setFloat32(offset+i*4,value,true));}}
 };
 if(!environment.routeDataLoaded)throw Error('AI route loader not connected');
 if(world.f32(0x4e7238)!==Math.fround(environment.worldHeight*16))throw Error('AI lookahead construction differs');
 return connectMcmRetainedAiController(c,runtime,environment);
}
