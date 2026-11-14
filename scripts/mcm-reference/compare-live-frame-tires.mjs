import {writeFrameAnimation,compareFrameRiderVisuals} from './compare-live-frame-rider-visuals.mjs';
import {compareLiveFinishWorld} from './compare-live-finish-world.mjs';
import {loadLiveFrameBootstrap} from './live-frame-bootstrap.mjs';
import {advanceMcmRetainedFrame} from '../../src/physics/mcm/retained-frame.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
// First-frame boundaries by default; retained callers supply one shared context.
// Missing runner dependencies are never skipped silently.
export const compareLiveFrameTires=(inputs,after)=>compareLiveFrameBoundary(inputs,after,'tires');
export const compareLiveFrameMotion=(inputs,after)=>compareLiveFrameBoundary(inputs,after,'motion');
export const compareLiveFrameControls=(inputs,after)=>compareLiveFrameBoundary(inputs,after,'controls');
export const compareLiveFrameLoopRider=(inputs,after)=>compareLiveFrameBoundary(inputs,after,'loop-rider');
export const compareLiveFrameReturn=(inputs,after,options)=>compareLiveFrameBoundary(inputs,after,'return',options);
export const compareLiveFrameRider=(inputs,after)=>compareLiveFrameBoundary(inputs,after,'frame-rider');
export const compareLiveFrameFilter=(inputs,after)=>compareLiveFrameBoundary(inputs,after,'filter');
export const compareLiveFrameEffects=(inputs,after)=>compareLiveFrameBoundary(inputs,after,'frame-effects');
export const compareLiveFrameFinish=(inputs,after)=>compareLiveFrameBoundary(inputs,after,'finish');
function compareLiveFrameBoundary(inputs,after,boundary,options={}){
 const hasRider=boundary==='frame-rider'||boundary==='return',hasFilter=boundary==='filter'||hasRider,hasEffects=boundary==='frame-effects'||hasFilter;
 const hasEvents=boundary==='loop-rider'||boundary==='finish'||hasEffects;
 const stopStage=boundary==='loop-rider'?'rider':boundary==='frame-effects'?'effects':boundary;
 const {row}=inputs;
 if(after.phase!==`after-${boundary}`||after.playerFrame!==(options.retained?row.playerFrame:0)||after.pass!==0||after.bike!==row.bike||after.frameBits!==row.frameBits)throw Error('Tire observation boundary differs');
 const loaded=options.loaded??loadLiveFrameBootstrap(inputs),stop={},stages=[];
 try{advanceMcmRetainedFrame(loaded.context,{delta:bitsFloat(row.frameBits),mode:loaded.mode,input:loaded.input},stage=>{stages.push(stage);if(stage===stopStage)throw stop;});}
 catch(error){if(error!==stop)throw error;}
 if(stages.at(-1)!==stopStage)throw Error('Tire boundary not reached');

const before=Buffer.from(row.stateHex,'hex'),actual=Buffer.from(after.stateHex,'hex'),expected=Buffer.from(before);
const ints=new Set([0x8c0,0xc90,0xca4,0xca8,0xcac,0xcb0,0xcb4,0xcbc,0xcc0,0x8b8,0x8a4,0x878,0x880,0x618,0x72c,0x8b4,0x6fc,0x568,0x8d4,0xbfc,0x820,0x710,0x714,0x814,0x844,0x614,0xc68,0xb04,0xb08,0x724,0x88c,0x884,0x8b0,0xc40,0x8c4,0x8ac,0x4bc,0x870,0xc6c,0xc78,0x620,0x8bc,0x61c,0x6e0]);
for(const [key,value] of Object.entries(loaded.context.bike)){if(/^field[0-9a-f]+$/.test(key)){const o=parseInt(key.slice(5),16);expected.writeUInt32LE(ints.has(o)?value>>>0:floatBits(value),o);}}
for(const [key,o] of Object.entries({position:0x4f8,velocity:0x510,forward:0x4c0,up:0x4cc,tangent:0x578,rearTangent:0x584,normal:0x54c,offset:0x540,referencePosition:0x504,angularVelocity:0x534,worldAngularVelocity:0x528,localLever:0x654,acceleration:0x51c}))loaded.context.bike[key].forEach((v,i)=>expected.writeUInt32LE(floatBits(v),o+i*4));
expected.writeUInt32LE(floatBits(loaded.context.bike.mass),0x558);expected.writeUInt32LE(floatBits(loaded.context.bike.inverseMass),0x55c);
if(hasEvents)for(const [key,o] of Object.entries({savedHeading:0x898,boundsMin:0x218,boundsMax:0x224}))loaded.context.bike[key].forEach((v,i)=>expected.writeUInt32LE(floatBits(v),o+i*4));
if(hasRider)writeFrameAnimation(expected,loaded.context.frameRider.bikeAnimation);
if(boundary==='return')loaded.context.bike.savedPosition.forEach((v,i)=>expected.writeUInt32LE(floatBits(v),0x56c+4*i));
const differences=[];let changed=0;for(let o=0;o<actual.length;o+=4){if(before.readUInt32LE(o)!==actual.readUInt32LE(o))changed++;if(expected.readUInt32LE(o)!==actual.readUInt32LE(o))differences.push({offset:o.toString(16),original:actual.readUInt32LE(o),recovered:expected.readUInt32LE(o)});}

 let comparedWords=actual.length/4;

 if(boundary!=='tires'){
  if(after.engineAddress!==row.engineAddress||after.transformAddress!==row.transformAddress)throw Error('Motion object addresses differ');
  const compare=(name,beforeHex,afterHex,recovered)=>{
   const previous=Buffer.from(beforeHex,'hex'),original=Buffer.from(afterHex,'hex');
   if(original.length!==recovered.length||previous.length!==recovered.length)throw Error('Wrong motion observation size');
   for(let o=0;o<original.length;o+=4){comparedWords++;const word=original.readUInt32LE(o);if(previous.readUInt32LE(o)!==word)changed++;if(recovered.readUInt32LE(o)!==word)differences.push({object:name,offset:o.toString(16),original:word,recovered:recovered.readUInt32LE(o)});}
  };
  if(hasRider&&(!options.retained||after.visualState))compareFrameRiderVisuals(loaded,row,after,compare);
  const engine=Buffer.from(row.engineHex,'hex'),e=loaded.context.engine;
  for(const [key,offset,integer] of [['shiftTimer',0x168],['released',0x150,true],['state',0x160],['rpmDemand',0x15c],['previousRpmDemand',0x7c],['shiftThreshold',0x154],['gear',0x158,true]])engine.writeUInt32LE(integer?e[key]>>>0:floatBits(e[key]),offset);
  compare('engine',row.engineHex,after.engineHex,engine);
  if(hasEffects){
   if(after.visualEffects?.length!==3)throw Error('Missing emitter observations');
   for(let i=0;i<3;i++){
    const emitter=loaded.context.frameEffects.emitters[i];
    if(after.visualEffects[i].address!==emitter.address)throw Error('Emitter address changed');
    compare('visual-emitter-'+i,row.visualEffects[i].hex,after.visualEffects[i].hex,emitter.bytes);
   }
   const trace=loaded.context.frameEffects.queryTrace,last=trace.at(-1);
   for(const [key,value] of [['effectQueryCount',trace.length],['effectQueryResult',last?.result??0]]){
    comparedWords++;if(row[key]!==after[key])changed++;
    if(value!==after[key])differences.push({object:key,original:after[key],recovered:value});
   }
   if(last){
    const start=Buffer.alloc(12);last.start.forEach((x,i)=>start.writeFloatLE(x,i*4));
    compare('effect-query-start',row.terrainQuery.startHex,after.terrainQuery.startHex,start);
    if(last.result){const point=Buffer.alloc(12);last.point.forEach((x,i)=>point.writeFloatLE(x,i*4));compare('effect-query-hit',row.terrainQuery.outputHex,after.terrainQuery.outputHex,point);}
   }
  }
  if(hasFilter){
   if(row.accelerationFilterAddress!==after.accelerationFilterAddress)throw Error('Acceleration filter address differs');
   const bytes=Buffer.alloc(8),filter=loaded.context.frameTail.filter;
   bytes.writeFloatLE(filter.value,0);bytes.writeFloatLE(filter.duration,4);
   compare('acceleration-filter',row.accelerationFilterHex,after.accelerationFilterHex,bytes);
  }
  const matrix=Buffer.alloc(64);loaded.context.bodyNode.local.forEach((v,i)=>matrix.writeUInt32LE(floatBits(v),i*4));
  compare('body-local-matrix',row.matrixHex,after.matrixHex,matrix);
  if(hasEvents){
   if(row.effectAddress!==after.effectAddress)throw Error('Effect address differs');
   const effect=Buffer.alloc(16);loaded.context.effect.forEach((v,i)=>effect.writeUInt32LE(floatBits(v),i*4));
   compare('rider-effect',row.effectHex,after.effectHex,effect);
   comparedWords++;if(row.randomState!==after.randomState)changed++;
   if(loaded.random.state!==after.randomState)differences.push({object:'random-stream',original:after.randomState,recovered:loaded.random.state});
  }
  if(boundary==='controls'||hasEvents){
   if(after.riderAddress!==row.riderAddress)throw Error('Controller address differs');
   const rider=Buffer.from(row.riderHex,'hex');
   for(const [key,offset] of [['velocity',0x70],['angularVelocity',0x7c]])loaded.context.rider[key].forEach((v,i)=>rider.writeUInt32LE(floatBits(v),offset+i*4));
   if(hasEvents){
    loaded.context.rider.previousVelocity.forEach((v,i)=>rider.writeUInt32LE(floatBits(v),0x58+i*4));
    loaded.context.rider.selected.forEach((v,i)=>rider.writeUInt32LE(v>>>0,0x160+i*4));
    for(const [key,o] of [['flag13c',0x13c],['field140',0x140],['active16c',0x16c],['kind',0x170]])rider.writeUInt32LE(loaded.context.rider[key]>>>0,o);
   }
   if(boundary==='finish'||hasEffects)loaded.context.rider.baseAngularVelocity.forEach((v,i)=>rider.writeUInt32LE(floatBits(v),0x64+i*4));
   compare('rider-controller',row.riderHex,after.riderHex,rider);
   if(boundary==='finish'){
    const report=compareLiveFinishWorld(loaded,inputs.collision,inputs.afterWorld,expected,rider);
    comparedWords+=report.comparedWords;changed+=report.changedWords;differences.push(...report.differences);
   }
  }
 }
 return {scope:`Connected ${options.retained?'retained frame '+row.playerFrame:'first-frame'} scheduler through ${boundary==='tires'?'tire accumulation':boundary==='controls'?'normal control/alignment (grounded normal branch)':boundary==='loop-rider'?'event and rider handling':boundary==='finish'?'physics substep finish':hasEffects?(boundary==='return'?'frame return':boundary==='frame-rider'?'frame-end rider animation':boundary==='filter'?'frame acceleration filter':'enabled frame effects'):'motion integration'} from captured state and real terrain. ${boundary!=='tires'?'Bike allocation, observed engine prefix and body local matrix compared. Other component allocations, uncaptured transforms and stack outputs are not covered':'All 818 bike words compared. Engine, component allocations, transforms and stack outputs are not covered'} by this report. ${boundary==='controls'||hasEvents?'The rider-controller allocation is also compared. ':''}${hasEvents?'Rider effect and random state are compared. ':''}${hasEffects?'Three visual-emitter allocations and terrain-query count, return and start coordinates are compared. ':''}${hasFilter?'The acceleration-filter value and duration allocation is also compared. ':''}${hasRider&&after.visualState?'Captured visual transform allocations, rider visual object and all captured animation asset blocks are also compared. ':''}${boundary==='finish'?'All captured collision-world blocks are also compared, including overlapping bike/rider/transform words; total counts include those repeated checks. ':''}No complete-frame or trajectory parity.`,...(boundary==='finish'?{callbackTrace:loaded.ordered.trace}:{}),stages,comparedWords,changedWords:changed,differences:differences.length,firstDifferences:differences.slice(0,20),frontContact:loaded.context.contactPhase.frontContact,rearContact:loaded.context.contactPhase.rearContact};
}
