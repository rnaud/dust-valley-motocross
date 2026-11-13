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
 if(used.size!==observation.blocks.length)throw Error('Unreferenced animation blocks');
 return {records:observation.records.map(p=>records.get(p)),frames,children};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const observation=JSON.parse(fs.readFileSync(process.argv[2])),loaded=loadLiveAnimationAssets(observation);
 console.log(JSON.stringify({scope:'Read-only animation dependency observation; not an atomic replay checkpoint.',records:loaded.records.length,frames:loaded.frames.size,children:loaded.children.size,frameCounts:loaded.records.map(r=>r.frameCount),frameRates:loaded.records.map(r=>r.fps)},null,2));
}
