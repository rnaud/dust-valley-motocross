import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {checkpointMemory} from './live-checkpoint.mjs';
import {loadLiveSubstepStart} from './live-substep-start.mjs';
import {loadLiveWheelContacts} from './live-wheel-contacts.mjs';
import {readMcmTerrain} from './terrain-data.mjs';
import {scheduleMcmFrameState} from '../../src/physics/mcm/scheduler.js';
import {createMcmRandom} from '../../src/physics/mcm/random.js';
import {beginMcmSubstep} from '../../src/physics/mcm/contact-preparation.js';
import {updateMcmContactSubstep} from '../../src/physics/mcm/contact-substep.js';
import {bitsFloat,floatBits} from '../../src/physics/mcm/math.js';
export function compareLiveInitialContacts(checkpoint,rows,terrain){
 const [before,after]=rows,m=checkpointMemory(checkpoint),bike=checkpoint.bikeAddress;
 if(before?.phase!=='before-update'||after?.phase!=='after-update'||before.playerFrame!==0||after.playerFrame!==0||before.pass!==0||after.pass!==0||!before.scripted||before.requestedThrottle!==0||before.frameBits!==0x3ca3d70a)throw Error('Unsupported initial contact observation');
 const output=Buffer.from(after.stateHex,'hex'),component=m.u32(bike+0x8ec);
 if(m.f32(component+0x44)!==0||m.f32(bike+0x6f4)!==0||output.readFloatLE(0x6f4)!==0)throw Error('Initial steering must be neutral');
 const schedule=scheduleMcmFrameState(bitsFloat(before.frameBits),m.f32(bike+0x8c8),m.f32(bike+0x8cc),m.u32(bike+0x8d4));
 if(schedule.iterations!==1||floatBits(schedule.dt)!==after.dtBits)throw Error('Unsupported observed contact schedule');
 const loaded=loadLiveWheelContacts(checkpoint,before,terrain,{dt:schedule.dt,componentRate:0});
 const start=loadLiveSubstepStart(checkpoint,{visuals:loaded.visuals,dt:schedule.dt});
 const random=createMcmRandom(before.randomState);start.context.engine.drawRandom=()=>random.draw();
 beginMcmSubstep(start.context);updateMcmContactSubstep(loaded.context);
 const values=[];
 for(const [key,offset] of [['heights',0x590],['tangent',0x578],['rearTangent',0x584]])for(let i=0;i<loaded.context[key].length;i++){
  const actual=floatBits(loaded.context[key][i]),expected=output.readUInt32LE(offset+i*4);values.push({field:key,index:i,actual,expected});
 }
 return {scope:'First controlled frame only: two contact depths and six tangent components compared with surviving original bike stores. Not full contact-stage or trajectory parity.',comparedStores:values.length,differences:values.filter(v=>v.actual!==v.expected),values,transformNodes:loaded.visuals.nodes.size};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [,,cp,trace,course]=process.argv;if(!course)throw Error('Usage: compare-live-initial-contacts.mjs checkpoint.json trace.jsonl dunes.trn');
 const bytes=fs.readFileSync(course),hash=createHash('sha256').update(bytes).digest('hex');
 if(hash!=='942b756572b407adf9223ecc1afb22556c5bc5636d3bd5e3ac51ef5419543d0b')throw Error('Unsupported terrain provenance');
 const rows=fs.readFileSync(trace,'utf8').trim().split('\n').slice(0,2).map(JSON.parse),report=compareLiveInitialContacts(JSON.parse(fs.readFileSync(cp)),rows,readMcmTerrain(bytes));
 console.log(JSON.stringify({...report,terrainSha256:hash},null,2));if(report.differences.length)process.exitCode=1;
}
