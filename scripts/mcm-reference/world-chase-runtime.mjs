import assert from 'node:assert/strict';
import {decodeChaseFrameMemory} from './chase-frame-memory.mjs';
import {createChaseFrameComparison} from './analyze-chase-frame.mjs';
const bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
// Initialize camera state once at the same atomic world checkpoint as the bikes.
// Subsequent camera entries supply world/device context only. Bike and rider
// inputs are projected from the retained simulation and compared before use.
export function connectWorldChaseRuntime(runtime,files,terrain){
 const raw=JSON.parse(files['world-camera-initial.json']),initial=decodeChaseFrameMemory(raw);
 assert.equal(raw.phase,'world-entry');assert.equal(raw.frame,0);assert.equal(raw.deltaBits,runtime.world.entry.dtBits);
 assert.equal(raw.camera,runtime.world.entry.view,'Camera/world checkpoint identity differs');
 assert.equal(raw.blocks.find(b=>b.address===runtime.world.entry.world)?.hex,runtime.world.entry.worldHex,'Camera/world checkpoint bytes differ');
 const cameraBytes=Buffer.from(raw.blocks.find(b=>b.address===raw.camera).hex,'hex'),target=cameraBytes.readUInt32LE(0x1ec),bike=runtime.bikes.get(target);
 if(!bike)throw Error('Camera target is outside retained bikes');
 assert.equal(raw.blocks.find(b=>b.address===target)?.hex,runtime.world.bikes.find(b=>b.address===target).artifacts.bike.blocks.find(b=>b.address===target).hex,'Camera/bike checkpoint bytes differ');
 const rows=files['world-camera-observations.jsonl'].trim().split('\n').filter(Boolean).map(JSON.parse).map(row=>{
  assert.equal(row.camera,raw.camera,'Joined camera identity changed');
  const bytes=Buffer.from(row.blocks.find(b=>b.address===row.camera).hex,'hex');
  assert.equal(bytes.readUInt32LE(0x1ec),target,'Joined camera target changed');
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
  assert.deepEqual(differences,[],'Retained bike camera inputs differ at frame '+row.frame);comparedInputWords+=indices.length;
  return {...row,inputs};
 };
 projectEntry(initial);
 const comparison=createChaseFrameComparison(terrain,{initial,projectEntry});
 return {address:raw.camera,target,reports,
  get projection(){return comparison.state?.matrices.slice(32,48)??new Float32Array(Uint32Array.from(initial.matrices.slice(32,48)).buffer);},
  step(frame,delta){
   if(frame===0)return initial.cameraPose.slice(0,3);
   const selected=rows.filter(r=>r.frame===frame);assert.equal(selected.length,3,'Missing joined camera phase');
   for(const row of selected){assert.equal(row.deltaBits,bits(delta),'Camera/world delta differs');comparison.observe(row);consumed++;}
   reports.push({frame,target,inputWords:24,outputWords:150});
   return comparison.state.renderCamera.values.slice(0,3).map(bits);
  },
  finish(){assert.equal(consumed,rows.length,'Unconsumed camera observations');return {...comparison.finish(),comparedInputWords,target};}
 };
}
