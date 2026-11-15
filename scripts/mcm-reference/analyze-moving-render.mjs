import assert from 'node:assert/strict';
import {compareLiveRetainedRiderFrames} from './compare-live-retained-rider-frames.mjs';
const bits=v=>Array.from(new Uint32Array(v.buffer,v.byteOffset,v.length));
export function analyzeMovingRender(input,rows,events,render){
 let returnSamples=0,returnWords=0,drawSamples=0,drawWords=0;
 const wrappers=new Map(),stores=new Map();let pending=null,storeCount=0;
 for(const r of render){
  assert.ok(Number.isInteger(r.frame)&&r.frame>=0&&r.frame<rows.length/2);
  if(r.phase==='wrapper'){assert.equal(r.words.length,42);if(!wrappers.has(r.frame))wrappers.set(r.frame,[]);wrappers.get(r.frame).push(r);}
  else if(r.phase==='store-before'){assert.equal(pending,null);pending=r;}
  else if(r.phase==='store-after'){assert.ok(pending);assert.equal(r.frame,pending.frame);assert.equal(r.value,pending.value,'Actual SSE store differs');if(!stores.has(r.frame))stores.set(r.frame,[]);stores.get(r.frame).push(r.value);storeCount++;pending=null;}
  else throw Error('Unknown moving render observation');
 }
 assert.equal(pending,null);
 const sourceWords=s=>[...bits(s.local),...bits(s.center),...bits(s.extent)];
 const replay=compareLiveRetainedRiderFrames(input,rows,events,{
  onBikeReturn({after,sources}){
   assert.equal(after.renderSources?.length,2);
   for(const s of sources){const observed=after.renderSources.find(o=>o.actor===s.actor);assert.ok(observed);assert.equal(observed.node,s.node);assert.deepEqual(sourceWords(s),observed.words,'Retained update-return draw source differs');returnSamples++;returnWords+=22;}
  },
  onWorldFrame({frame,sources}){
   const draws=wrappers.get(frame)??[];
   if(frame<rows.length/2-1){assert.equal(draws.length,2,'Missing player/rider draw observations');assert.equal(new Set(draws.map(r=>r.actor)).size,2);}
   for(const observed of draws){const s=sources.find(s=>s.actor===observed.actor);assert.ok(s);assert.equal(observed.node,s.node);assert.deepEqual(sourceWords(s),[...observed.words.slice(0,16),...observed.words.slice(32,38)],'Retained draw-time source differs');drawSamples++;drawWords+=22;}
  }
 });
 let carryChecks=0,carryDifferences=0,multipleStoreFrames=0;const firstCarryDifferences=[];
 for(const [frame,values]of stores){
  if(values.length>1)multipleStoreFrames++;
  const next=rows[(frame+1)*2];if(!next)continue;
  const original=Buffer.from(next.stackHex,'hex').readUInt32LE(0x54),lastStore=values.at(-1);carryChecks++;
  if(original!==lastStore){carryDifferences++;if(firstCarryDifferences.length<20)firstCarryDifferences.push({frame,lastStore,nextEntry:original});}
 }
 return {returnSamples,returnWords,drawSamples,drawWords,storeCount,carryChecks,carryDifferences,multipleStoreFrames,firstCarryDifferences,
  bikeFrames:replay.bikeFrames,riderTicks:replay.riderTicks,poolTicks:replay.poolTicks,physicsDifferences:replay.physicsDifferences,visualDifferences:replay.visualDifferences,particleDifferences:replay.particleDifferences};
}
