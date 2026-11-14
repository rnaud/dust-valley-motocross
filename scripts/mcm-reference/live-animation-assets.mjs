import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {checkpointMemory} from './live-checkpoint.mjs';

// Observation only: these linked objects must be captured at a frame boundary
// before combining them with a replay checkpoint. Preserve shared child identity.
export function loadLiveAnimationAssets(observation){
 if(observation?.kind!=='mcm-animation-observation'||observation.records?.length!==21)throw Error('Invalid animation observation');
 const m=checkpointMemory({...observation,kind:'mcm-partial-local-checkpoint'}),used=new Set(),children=new Map(),frames=new Map(),records=new Map();
 const read=(address,size)=>{const b=observation.blocks.find(b=>b.address===address);if(b?.size!==size)throw Error('Wrong animation block type');used.add(address);return m.read(address,size);};
 const vec=(b,o)=>[0,4,8].map(i=>b.readFloatLE(o+i));
 const childChain=start=>{
  const seen=new Set();let address=start,previous,first;
  while(address){
   if(seen.has(address)||seen.size>=256)throw Error('Cyclic or oversized child chain');seen.add(address);
   const b=read(address,0x30);
   let child=children.get(address);
   if(!child){child={token:address,componentIndex:b.readUInt8(0),local:b.readUInt32LE(4),forward:vec(b,8),up:vec(b,0x14),position:vec(b,0x20)};children.set(address,child);}
   if(previous)previous.next=child;else first=child;
   previous=child;address=b.readUInt32LE(0x2c);
  }
  if(previous)previous.next=null;
  return first??null;
 };
 for(const token of observation.records){
  if(records.has(token))continue;
  const b=read(token,0x78),frameCount=b.readUInt32LE(0x6c);
  if(!frameCount||frameCount>10000)throw Error('Invalid animation frame count');
  const record={token,frameCount,loop:b.readUInt32LE(0x70),fps:b.readUInt32LE(0x74)};
  let address=b.readUInt32LE(0x68),previous;const seen=new Set();
  for(let index=0;index<frameCount;index++){
   if(!address||seen.has(address))throw Error('Short or cyclic frame chain');seen.add(address);
   const raw=read(address,0x34);if(raw.readUInt32LE(0)!==index)throw Error('Animation frame index differs');
   let frame=frames.get(address);
   if(!frame){frame={token:address,index,boundsMin:vec(raw,0x1c),boundsMax:vec(raw,0x28),firstChild:childChain(raw.readUInt32LE(0xc))};frames.set(address,frame);}
   if(previous)previous.next=frame;else record.firstFrame=frame;
   previous=frame;address=raw.readUInt32LE(0x18);
  }
  if(address)throw Error('Long frame chain');previous.next=null;records.set(token,record);
 }
 for(const [field,count] of [['retainedFrames',6],['boundsFrames',2]]){
  if(observation[field]===undefined)continue;
  if(!Array.isArray(observation[field])||observation[field].length!==count)throw Error(`Invalid ${field} pointers`);
  for(const token of observation[field]){
   if(!Number.isInteger(token)||token<0||token>0xffffffff)throw Error('Invalid retained frame pointer');
   if(!token||frames.has(token))continue;
   const raw=read(token,0x34);
   // Historical frames are pose references, not independently advanced chains.
   frames.set(token,{token,index:raw.readUInt32LE(0),boundsMin:vec(raw,0x1c),boundsMax:vec(raw,0x28),firstChild:childChain(raw.readUInt32LE(0xc))});
  }
 }
 if(used.size!==observation.blocks.length)throw Error('Unreferenced animation blocks');
 return {records:observation.records.map(p=>records.get(p)),frames,children};
}
// Original animation object prefix, shared by bike and rider proxy. Null
// history pointers stay null; non-null missing assets must never become defaults.
export function loadLiveAnimationState(memory,address,assets){
 const u=o=>memory.u32(address+o),f=o=>memory.f32(address+o);
 const frame=o=>{const p=u(o);if(!p)return null;const value=assets.frames.get(p);if(!value)throw Error(`Missing retained animation frame at 0x${p.toString(16)}`);return value;};
 const pointer=u(0x10),record=pointer?assets.records.find(r=>r.token===pointer):null;
 if(pointer&&!record)throw Error('Missing active animation record');
 const state={stopped:u(4),remainder:f(8),record,frame:frame(0x14),displayedFrame:frame(0x18),previousFrame:frame(0x1c),blendFrame:frame(0x20),
  blendTime:f(0x24),blendDuration:f(0x28),blending:u(0x2c),field30:u(0x30),
  boundsMin:[0,4,8].map(o=>f(0x218+o)),boundsMax:[0,4,8].map(o=>f(0x224+o))};
 if(!state.stopped&&(!record||!state.frame))throw Error('Incomplete running animation');
 if(state.blending&&!state.blendFrame)throw Error('Missing blend animation frame');
 if(record&&state.frame){let belongs=false;for(let p=record.firstFrame;p;p=p.next)if(p===state.frame)belongs=true;if(!belongs)throw Error('Active animation frame belongs to another record');}
 return state;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const observation=JSON.parse(fs.readFileSync(process.argv[2])),loaded=loadLiveAnimationAssets(observation);
 console.log(JSON.stringify({scope:'Read-only animation dependency observation; not an atomic replay checkpoint.',records:loaded.records.length,frames:loaded.frames.size,children:loaded.children.size,frameCounts:loaded.records.map(r=>r.frameCount),frameRates:loaded.records.map(r=>r.fps)},null,2));
}
