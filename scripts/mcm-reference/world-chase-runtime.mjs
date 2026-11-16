import {connectMcmWorldCamera} from '../../src/physics/mcm/world-camera.js';
import {resolveMcmWorldMatrix} from '../../src/physics/mcm/world-transform.js';
import assert from 'node:assert/strict';
import {decodeChaseFrameMemory} from './chase-frame-memory.mjs';
import {createChaseFrameComparison} from './analyze-chase-frame.mjs';
const bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
// Initialize camera state once at the same atomic world checkpoint as the bikes.
// Subsequent camera entries supply world/device context only. Bike and rider
// inputs are projected from the retained simulation and compared before use.
export function connectWorldChaseRuntime(runtime,files,terrain){
 const raw=JSON.parse(files['world-camera-initial.json']);
 const {initial,target,bike,riderPoint,retained,visibility}=connectMcmWorldCamera(runtime,raw,terrain);
 const cameraBytes=Buffer.from(raw.blocks.find(b=>b.address===raw.camera).hex,'hex'),viewport=Array.from({length:4},(_,i)=>cameraBytes.readUInt32LE(0x178+i*4));
 const rows=files['world-camera-observations.jsonl'].trim().split('\n').filter(Boolean).map(JSON.parse).map(row=>{
  assert.equal(row.camera,raw.camera,'Joined camera identity changed');
  const bytes=Buffer.from(row.blocks.find(b=>b.address===row.camera).hex,'hex');
  assert.equal(bytes.readUInt32LE(0x1ec),target,'Joined camera target changed');
  assert.deepEqual(Array.from({length:4},(_,i)=>bytes.readUInt32LE(0x178+i*4)),viewport,'Unrecovered viewport change');
  return decodeChaseFrameMemory(row);
 }),reports=[];
 let comparedInputWords=0,consumed=0;
 const projectEntry=row=>{
  const inputs=row.inputs.slice(),view=bike.projection.projectBody(),indices=[];
  for(const [i,o,n]of [[17,0x4ec,1],[18,0x4dc,1],[29,0x560,1],[32,0x844,1],[36,0x510,3],[39,0x5ec,1],[40,0x6a4,1],[42,0x6b0,1],[43,0xbfc,1],[45,0x8b4,1],[54,0x4c0,3],[57,0x620,1],[86,0x4e8,1],[87,0x4d8,1]])for(let j=0;j<n;j++){inputs[i+j]=view.getUint32(o+j*4,true);indices.push(i+j);}
  const rider=bike.external.context.rider;
  for(const [i,v]of [[46,rider.field144],[47,bike.loaded.context.rider.kind],[48,rider.field140]]){inputs[i]=v>>>0;indices.push(i);}
  for(let j=0;j<3;j++){inputs[58+j]=bits(bike.loaded.visuals.bike.bodyNode.local[12+j]);indices.push(58+j);}
  const differences=indices.filter(i=>inputs[i]!==row.inputs[i]).map(i=>({index:i,actual:inputs[i],expected:row.inputs[i]}));
  assert.deepEqual(differences,[],'Retained bike camera inputs differ at frame '+row.frame);comparedInputWords+=indices.length+3;
  const alternate={...row.alternate};
  assert.equal(bits(alternate.bike890),view.getUint32(0x890,true),'Crash camera bike heading differs');
  assert.equal(alternate.bike8a4,view.getUint32(0x8a4,true),'Crash camera bike flag differs');
  assert.equal(alternate.rider13c,rider.flag13c>>>0,'Crash camera rider flag differs');
  alternate.bike890=view.getFloat32(0x890,true);alternate.bike8a4=view.getUint32(0x8a4,true);alternate.rider13c=rider.flag13c;
  const mode=inputs[11],enabled=mode===5||mode===2||!inputs[32]||(inputs[45]===6&&!inputs[46])||(inputs[47]===2&&inputs[48]!==0);
  if(!enabled)alternate.riderPoint=resolveMcmWorldMatrix(riderPoint).slice(12,15);
  return {...row,inputs,alternate};
 };
 projectEntry(initial);
 const comparison=createChaseFrameComparison(terrain,{initial,projectEntry,initialState:retained.state,advance(state,input,delta,services){
  assert.equal(state,retained.state);
  // The native entry only checks the derived inputs; it never supplies them.
  const derived=retained.input();
  assert.deepEqual(derived,input,'Autonomous retained chase input differs');
  return retained.step(delta,services);
 }});

 return {address:raw.camera,target,reports,visibility,viewport,
  get cameraState(){return comparison.state;},
  get position(){return comparison.state?.renderCamera.values.slice(0,3)??Array.from(new Float32Array(Uint32Array.from(initial.cameraPose.slice(0,3)).buffer));},
  get projection(){return comparison.state?.matrices.slice(32,48)??new Float32Array(Uint32Array.from(initial.matrices.slice(32,48)).buffer);},
  step(frame,delta){
   if(frame===0)return initial.cameraPose.slice(0,3);
   const selected=rows.filter(r=>r.frame===frame);assert.equal(selected.length,3,'Missing joined camera phase');
   for(const row of selected){assert.equal(row.deltaBits,bits(delta),'Camera/world delta differs');comparison.observe(row);consumed++;}
   reports.push({frame,target,inputWords:27,outputWords:150});
   return comparison.state.renderCamera.values.slice(0,3).map(bits);
  },
  finish(){assert.equal(consumed,rows.length,'Unconsumed camera observations');return {...comparison.finish(),comparedInputWords,target};}
 };
}
