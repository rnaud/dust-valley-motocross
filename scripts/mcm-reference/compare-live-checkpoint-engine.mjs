import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {brotliDecompressSync} from 'node:zlib';
import {loadLiveEngine} from './live-checkpoint.mjs';
import {compareBikeReplay} from './compare-bike.mjs';
import {updateMcmSubstepStart} from '../../src/physics/mcm/substep-start.js';
import {scheduleMcmFrameState} from '../../src/physics/mcm/scheduler.js';
import {createMcmRandom} from '../../src/physics/mcm/random.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
const fields=[['gear',0x158,true],['released',0x150,true],['state',0x160],['rpmDemand',0x15c],['previousRpmDemand',0x7c],['shiftTimer',0x168],['shiftThreshold',0x154]];

// Retain engine/filter/RNG state from a real checkpoint. Upstream chassis state
// is supplied at each observed frame entry, not simulated by this comparator.
export function compareLiveCheckpointEngine({rows,checkpoint,executableSha256}){
 if(executableSha256!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw Error('Unsupported executable provenance');
 const replay=compareBikeReplay(rows),differences=[];let comparedStores=0,frames=0;
 const passes=[];
 for(const pass of [0,1]){
  const records=rows.filter(r=>r.pass===pass),{engine,memory:m,address}=loadLiveEngine(checkpoint),bike=checkpoint.bikeAddress;
  if(parseInt(records[0].bike,16)!==bike||parseInt(records[0].engineAddress,16)!==address)throw Error('Checkpoint identity differs');
  if(m.read(bike,0xcc8).toString('hex')!==records[0].stateHex||m.read(address,0x16c).toString('hex')!==records[0].engineHex)throw Error('Checkpoint differs from initial frame');
  const random=createMcmRandom(12345),filter=m.u32(bike+0x8fc);
  engine.drawRandom=()=>random.draw();
  const c={engine,mass:m.f32(bike+0x558),inverseMass:m.f32(bike+0x55c),field694:m.f32(bike+0x694),brake:m.f32(bike+0x5e4),previousSpeed:m.f32(bike+0x564),previousY:m.f32(bike+0x84c),accelerationFilter:{value:m.f32(filter),duration:m.f32(filter+4)},
   input:{presentMask:1,brakeResponses:[0,0,0,0,0,0],throttleResponses:[0,0,0,0,0,0]},analog:-1};
  const compare=(frame,phase,row)=>{
   const expected=Buffer.from(row.engineHex,'hex');
   for(const [field,offset,integer] of fields){
    const actual=integer?engine[field]:floatBits(engine[field]),bits=expected.readUInt32LE(offset);comparedStores++;
    if(actual!==bits)differences.push({pass,frame,phase,field,actual,expected:bits});
   }
   if(random.state!==row.randomState)differences.push({pass,frame,phase,field:'randomState',actual:random.state,expected:row.randomState});
  };
  for(let frame=0;frame<replay.framesPerPass;frame++){
   const before=records[frame*2],after=records[frame*2+1],b=Buffer.from(before.stateHex,'hex');
   const f=o=>b.readFloatLE(o),u=o=>b.readUInt32LE(o);
   if(u(0x844)||u(0x614)||u(0xc68)||u(0x6f8)||u(0xb04)||u(0xb08))throw Error('Unsupported live controller/state');
   const schedule=scheduleMcmFrameState(bitsFloat(before.frameBits),f(0x8c8),f(0x8cc),u(0x8d4));
   if(schedule.iterations!==1)throw Error('Intermediate chassis observations required for multiple substeps');
   compare(frame,'before-update',before);
   Object.assign(c,{dt:schedule.dt,inverseDt:Math.fround(schedule.inverseDt),state844:0,aiThrottle:0,aiBrake:0,
    speed:f(0x6a4),
    velocity:[f(0x510),f(0x514),f(0x518)]});
   c.input.throttleResponses[0]=before.requestedThrottle;
   updateMcmSubstepStart(c);compare(frame,'after-update',after);
   const output=Buffer.from(after.stateHex,'hex');
   for(const [field,offset] of [['brake',0x5e4],['filteredAcceleration',0x848],['previousY',0x84c],['previousSpeed',0x564]]){
    const actual=floatBits(c[field]),expected=output.readUInt32LE(offset);comparedStores++;
    if(actual!==expected)differences.push({pass,frame,phase:'after-update',field,actual,expected});
   }
   frames++;
  }
  passes.push({pass,frames:records.length/2,randomCalls:random.calls,randomState:random.state});
 }
 return {scope:'Retained engine-entry state initialized from captured memory; original chassis inputs supplied each frame. Not whole-bike parity.',
  frames,comparedStores,comparedRandomStates:frames*2,differences: differences.length,firstDifferences:differences.slice(0,20),passes,
  unexplainedBikeWords:Object.keys(replay.differingBikeWords)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3)throw Error('Usage: compare-live-checkpoint-engine.mjs fixture.json.br');
 const report=compareLiveCheckpointEngine(JSON.parse(brotliDecompressSync(fs.readFileSync(process.argv[2]))));
 console.log(JSON.stringify(report,null,2));if(report.differences)process.exitCode=1;
}
