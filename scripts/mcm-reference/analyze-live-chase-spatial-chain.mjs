import assert from 'node:assert/strict';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {deriveMcmChaseSource,deriveMcmChaseBase} from '../../src/physics/mcm/chase-spatial-inputs.js';
import {stepMcmHeadingChase} from '../../src/physics/mcm/chase-heading.js';
const floats=w=>new Float32Array(Uint32Array.from(w).buffer),bits=f=>Array.from(new Uint32Array(f.buffer));
const filterBits=state=>{const f=new Float32Array(24);state.filters.forEach((r,i)=>f.set(r,i*4));return bits(f);};
const cameraWords=r=>[r.inputs[23],r.inputs[24],r.inputs[26],r.inputs[27],r.inputs[28],...r.inputs.slice(33,36),r.inputs[49],...r.inputs.slice(50,54)];
const cameraState=s=>{const c=s.camera;return [...bits(Float32Array.of(c.pitch,c.radius,c.yaw,c.orbitAngle)),s.eyeResetFlag,...bits(c.backup),...bits(Float32Array.of(c.zoom)),...bits(s.settings)];};
export function analyzeLiveChaseSpatialChain(rows){
 let state=null,pending=null,identity=null,pairs=0,active=0,bypassed=0;const modes=new Set();let resets=0;
 const phases=['source-entry','source-exit','base-entry','base-exit','before','after'];
 let phaseIndex=0,sourceEntry=null,baseEntry=null,source=null,base=null,retainedTarget=null,retainedTargetChecks=0;
 for(const r of rows){
  for(const [name,n] of [['inputs',62],['filters',24],['pointers',6],['targets',6],['result',6]])assert.ok(Array.isArray(r[name])&&r[name].length===n&&r[name].every(v=>Number.isInteger(v)&&v>=0&&v<=0xffffffff),'Invalid '+name);
  assert.ok(Number.isInteger(r.deltaBits)&&r.deltaBits>=0&&r.deltaBits<=0xffffffff,'Invalid delta');
  assert.equal(r.phase,phases[phaseIndex],'Missing or reordered spatial stage');phaseIndex=(phaseIndex+1)%phases.length;
  assert.equal(r.frame,pairs,'Nonsequential spatial frame');
  if(r.phase==='source-entry'){
   sourceEntry=r;const v=floats(r.inputs);
   source=deriveMcmChaseSource({direction:v.slice(54,57),velocity:v.slice(36,39),bike6a4:v[40],bike620:r.inputs[57]}).source;
  }else{
   for(const name of ['camera','ebp','deltaBits'])assert.equal(r[name],sourceEntry[name],'Spatial frame identity changed');
  }
  if(r.phase==='source-exit'){
   assert.equal(r.esp,sourceEntry.esp,'Source stack changed');assert.deepEqual(r.inputs.slice(13,16),bits(source),'Native source differs');
  }else if(r.phase==='base-entry'){
   baseEntry=r;const v=floats(r.inputs);
   if(retainedTarget){assert.deepEqual(r.result.slice(0,3),bits(retainedTarget),'Retained target differs at base entry');retainedTargetChecks++;}
   else retainedTarget=floats(r.result.slice(0,3));
   base=deriveMcmChaseBase({position:v.slice(58,61),velocity:v.slice(36,39),delta:floats([r.deltaBits])[0],usePrevious:r.inputs[61],previousTarget:retainedTarget}).base;
  }else if(r.phase==='base-exit'){
   assert.equal(r.esp,baseEntry.esp,'Base stack changed');assert.deepEqual(r.inputs.slice(0,3),bits(base),'Native base differs');
  }
  if(r.phase==='before'){
   assert.deepEqual(r.inputs.slice(13,16),bits(source),'Source differs before heading');assert.deepEqual(r.inputs.slice(0,3),bits(base),'Base differs before heading');
   assert.equal(pending,null,'Unpaired entry');assert.equal(r.frame,pairs,'Nonsequential frame');
   if(!state){
    assert.ok(r.pointers.every(p=>p!==0),'Live initialization not captured');
    const initial=floats(r.inputs);
    state={settings:initial.slice(50,54),eyeResetFlag:r.inputs[28],camera:{zoom:initial[49],pitch:initial[23],radius:initial[24],yaw:initial[26],orbitAngle:initial[27],backup:initial.slice(33,36)},axis:floats(r.inputs.slice(20,23)),filters:Array.from({length:6},(_,i)=>floats(r.filters.slice(i*4,i*4+4)))};
    identity={camera:r.camera,pointers:r.pointers};
   }
   assert.deepEqual({camera:r.camera,pointers:r.pointers},identity,'Camera identity changed');
   assert.deepEqual(r.filters,filterBits(state),'Retained filters differ');
   assert.deepEqual(cameraWords(r),cameraState(state),'Retained camera state differs');
   assert.deepEqual(r.inputs.slice(20,23),bits(state.axis),'Retained shared axis differs');
   const v=floats(r.inputs),args={base:Float32Array.from(base),offset:v.slice(3,6),eye:v.slice(6,9),factor:v[9],distance:v[10],mode:r.inputs[11],actorType:r.inputs[12],source:Float32Array.from(source),angle:v[16],bank:v[17],lean:v[18],enabled:r.inputs[19],previousTarget:floats(r.targets.slice(0,3)),heading:v[25],speedBits:r.inputs[29],eyeGate:r.inputs[30],motionGate:r.inputs[31],crashed:r.inputs[32],velocity:v.slice(36,39),denominator5ec:v[39],denominator6a4:v[40],multiplier:v[41],bike6b0:v[42],bikeBfc:r.inputs[43],manager314:r.inputs[44],bike8b4:r.inputs[45],rider144:r.inputs[46],rider170:r.inputs[47],rider140:r.inputs[48]};
   const result=stepMcmHeadingChase(state,args,floats([r.deltaBits])[0]),values=new Float32Array(6);values.set(result.target);values.set(result.eye,3);
   retainedTarget=Float32Array.from(result.target);if(result.reset)resets++;modes.add(args.mode);if(result.rotation.active)active++;else bypassed++;
   pending={row:r,targets:bits(result.targets),result:bits(values)};
  }else if(r.phase==='after'){
   assert.ok(pending,'Missing entry');
   for(const name of ['frame','camera','esp','ebp','deltaBits'])assert.equal(r[name],pending.row[name],'Boundary changed');
   assert.deepEqual(r.pointers,identity.pointers,'Filter identity changed');
   assert.deepEqual(r.inputs.slice(20,23),bits(state.axis),'Native shared axis differs');
   assert.deepEqual(r.targets,pending.targets,'Native targets differ');
   assert.deepEqual(r.filters,filterBits(state),'Native filters differ');
   assert.deepEqual(r.result,pending.result,'Native result differs');assert.deepEqual(cameraWords(r),cameraState(state),'Native camera state differs');pairs++;pending=null;
  }
 }
 assert.ok(state&&!pending&&phaseIndex===0,'Incomplete capture');return {pairs,downstreamWords:pairs*52,spatialWords:pairs*12,retainedTargetChecks,active,bypassed,resets,modes:[...modes].sort()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeLiveChaseSpatialChain(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
