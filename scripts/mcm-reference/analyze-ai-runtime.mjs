import assert from 'node:assert/strict';
import {advanceMcmAiController} from '../../src/physics/mcm/ai-controller.js';
import {createMcmRandom} from '../../src/physics/mcm/random.js';
import {queryMcmTerrainHeight} from '../../src/physics/mcm/terrain-height.js';
import {queryMcmTerrainNormal} from '../../src/physics/mcm/terrain-normal.js';
import {decodeAiMotionGraph} from './analyze-ai-motion-graph.mjs';
import {bitsFloat as float,floatBits as bits} from '../../src/physics/mcm/math.js';
const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength),vector=(b,o)=>[0,4,8].map(i=>b.readFloatLE(o+i));
// Adapter reads controller-entry state and world resources only. No computed
// control, trick selection or intermediate controller scratch is an input.
export function analyzeAiRuntime(rows,options){
 const route=rows.find(r=>r.phase==='route'),table=route.nodes.map(n=>n.address),nodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),y:float(n.words[1]),z:float(n.words[2]),speed:float(n.words[3]),kind:n.words[4],speedLimit:float(n.words[5]),offsetX:float(n.words[6]),offsetZ:float(n.words[7]),distance:float(n.words[8]),flag:n.words[9],next:n.words[10]}]));
 const rng=createMcmRandom(rows.find(r=>r.phase==='random').state),pending=[],random={get state(){return rng.state;},get calls(){return rng.calls;},draw(){pending.push(rng.state);return rng.draw();}};let calls=0,tricks=0,rotations=0,graphNodes=0,current;
 for(const row of rows){
  if(row.phase==='before'){
   const seq=row.sequence,at=phase=>rows.find(r=>r.phase===phase&&r.sequence===seq),entry=at('controller-graph-before');assert.ok(entry,'Runtime requires controller-entry graph');assert.equal(entry.hex,row.hex);
   const body=Buffer.from(row.hex,'hex'),b=view(body),graph=decodeAiMotionGraph(entry),bounds=Buffer.from(entry.bounds,'hex'),proxy=Buffer.from(entry.proxy,'hex'),envelope=Buffer.from(entry.envelope,'hex');
   for(const n of graph.values()){n.world=Array.from({length:16},(_,i)=>n.bytes.readFloatLE(0xc4+i*4));const parent=n.bytes.readUInt32LE(0x108);if(parent){assert.ok(graph.has(parent));n.parent=graph.get(parent);}}
   const components=[],boundsChildren=entry.records.map(record=>{const bytes=Buffer.from(record.hex,'hex'),componentIndex=bytes[0];components[componentIndex]=graph.get(record.component);return {componentIndex,local:!!bytes.readUInt32LE(4),forward:vector(bytes,8),up:vector(bytes,0x14),position:vector(bytes,0x20)};});
   const c={id:row.bike,body:b,route:{nodes,table},setup:{graph:{target:graph.get(entry.root),source:graph.get(entry.source),components,boundsChildren},boundsMin:vector(bounds,0x1c),boundsMax:vector(bounds,0x28)},animations:entry.animations,proxy:view(proxy),envelope:view(envelope)};
   const context=at('race-context'),actor=a=>({id:a.address,body:view(Buffer.from(a.hex,'hex'))}),blocks=new Map();let pointer=0;
   const heap={calloc:(count,size)=>{assert.ok(count<=8&&size===20,'Unvalidated heap request');blocks.set(++pointer,Math.max(16,Math.ceil(count*size/16)*16));return pointer;},size:p=>{assert.ok(blocks.has(p));return blocks.get(p);},free:p=>{if(p)assert.ok(blocks.delete(p));}};
   const env={mode:context.mode,raceSetting:context.enabled,raceContext:context.raceFlag,routeDataLoaded:1,loadRouteData:()=>assert.fail('Unexpected loader'),initialProgress:0,player:{id:context.other,body:view(Buffer.from(context.otherHex,'hex')),routeDistances:[]},firstActors:(at('actors')?.actors??[]).map(actor),secondActors:(at('second-actors')?.actors??[]).map(actor),worldHeight:options.worldHeight,margin:options.margin,queryHeight:point=>queryMcmTerrainHeight({...options.terrain,point}),queryNormal:point=>queryMcmTerrainNormal({...options.terrain,point,normal:[0,0,0]}),random,heap,accounting:{bytes:0}};
   const result=advanceMcmAiController(c,env,float(row.dtBits));assert.equal(result.status,'complete');assert.equal(blocks.size,0);current={seq,body,graph,entry,proxy,envelope,boundsChildren,result};
  }
  if(row.phase==='random'){
   if(pending.length){assert.equal(row.inAi,1,'Unexpected external draw during runtime controller');assert.equal(row.state,pending.shift(),'Runtime shared random state');}
   else{assert.equal(row.inAi,0,'Missing runtime random draw');assert.equal(row.state,rng.state,'External shared random state');rng.draw();}
  }
  if(row.phase==='after'){
   assert.equal(current.seq,row.sequence);assert.equal(pending.length,0);const observed=Buffer.from(row.hex,'hex');for(let o=0;o<observed.length;o+=4)assert.equal(current.body.readUInt32LE(o),observed.readUInt32LE(o),`Runtime body ${row.sequence} field ${o.toString(16)}`);
   const exit=rows.find(r=>r.phase==='controller-graph-after'&&r.sequence===row.sequence);assert.ok(exit);assert.deepEqual(current.proxy,Buffer.from(exit.proxy,'hex'),'Runtime rider animation');assert.deepEqual(current.envelope,Buffer.from(exit.envelope,'hex'),'Runtime envelope');assert.equal(exit.nodes.length,current.graph.size);
   for(const n of exit.nodes){const expected=current.graph.get(n.address);assert.ok(expected);const bytes=Buffer.from(expected.bytes);for(const [offset,array] of [[0x84,expected.local],[0xc4,expected.world]])array.forEach((v,i)=>bytes.writeUInt32LE(bits(v),offset+i*4));bytes.writeUInt32LE(expected.cacheValid,0x104);assert.deepEqual(bytes,Buffer.from(n.hex,'hex'),`Runtime graph ${row.sequence}:${n.address}`);graphNodes++;}
   current.entry.records.forEach((record,i)=>{const bytes=Buffer.from(record.hex,'hex'),child=current.boundsChildren[i];child.forward.forEach((v,k)=>bytes.writeUInt32LE(bits(v),8+k*4));child.up.forEach((v,k)=>bytes.writeUInt32LE(bits(v),0x14+k*4));assert.deepEqual(bytes,Buffer.from(exit.records[i].hex,'hex'),'Runtime bounds record');});
   calls++;tricks+=Number(current.result.trickSelected!==null);rotations+=Number(current.result.rotated);
  }
 }
 assert.ok(calls);assert.equal(pending.length,0);assert.equal(calls,rows.filter(r=>r.phase==='before').length);return {calls,tricks,rotations,graphNodes,randomDraws:rng.calls};
}
