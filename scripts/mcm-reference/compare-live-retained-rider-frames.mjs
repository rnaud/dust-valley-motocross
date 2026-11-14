import {loadLiveFrameBootstrap} from './live-frame-bootstrap.mjs';
import {connectLiveRiderTick} from './live-rider-tick.mjs';
import {compareLiveFrameReturn} from './compare-live-frame-tires.mjs';
import {advanceMcmRiderTick} from '../../src/physics/mcm/rider-tick.js';
import {bitsFloat,floatBits} from '../../src/physics/mcm/math.js';

// Diagnostic projection: physics and effects mismatches are counted separately,
// never removed. One initialization; only recorded input/timing/gates thereafter.
export function compareLiveRetainedRiderFrames(inputs,rows,events){
 if(!rows.length||rows.length%2||events[0]?.phase!=='initial-rider'||events[0].frame!==0||events[0].bike!==inputs.checkpoint.bikeAddress)throw Error('Missing retained rider initialization');
 const loaded=loadLiveFrameBootstrap({...inputs,row:rows[0]}),c=loaded.context;
 const external=connectLiveRiderTick({ordered:loaded.ordered,bikeAddress:inputs.checkpoint.bikeAddress,visuals:loaded.visuals,assets:loaded.animation.assets,animation:c.frameRider.riderAnimation,child:events[0],terrain:inputs.terrain}),r=external.context.rider;
 if(events[0].rider!==r.address)throw Error('Retained rider ownership differs');
 for(const [key,field]of [['extentScale','fieldf8'],['field138','field138'],['field144','field144'],['contactClass','field154'],['selected','selected'],['eventKind','kind']])Object.defineProperty(r,key,{get:()=>c.rider[field],set:value=>{c.rider[field]=value;}});
 Object.defineProperty(external.context,'selectedRecord',{get:()=>{const token=c.rider.selected[0],record=loaded.animation.assets.records.find(a=>a.token===token);if(token&&!record)throw Error('Missing retained selected animation');return record;}});
 let eventIndex=1,visualDifferences=0,physicsDifferences=0,comparedWords=0,externalWords=0,particleComparedWords=0,particleDifferences=0,pendingExternalTick=null,pendingBikeFrame=null;const reports=[],riderReports=[];
 for(let i=0;i<rows.length;i+=2){
  const row=rows[i],after=rows[i+1],frame=i/2;
  if(row.phase!=='before-update'||row.playerFrame!==frame||row.pass!==0||row.bike!==rows[0].bike||![0,1].includes(row.requestedThrottle))throw Error('Retained capture sequence differs');
  c.engineEntry.input.throttleResponses[0]=row.requestedThrottle;
  if(Object.hasOwn(row,'requestedBrake')!==Object.hasOwn(rows[0],'requestedBrake'))throw Error('Missing retained brake input');
  if(Object.hasOwn(row,'requestedBrake')){
   if(![0,1].includes(row.requestedBrake)||after.requestedBrake!==row.requestedBrake)throw Error('Retained brake input differs');
   c.engineEntry.input.brakeResponses[0]=row.requestedBrake;
  }
  let report;
  try{report=compareLiveFrameReturn({...inputs,row},after,{loaded,retained:true,diagnostic:true});}
  catch(error){if(error.message!=='Unmapped live frame dependency: context.restoreRiderVisual')throw error;pendingBikeFrame={frame,reason:error.message};break;}
  const physics=report.allDifferences.filter(d=>!d.object?.startsWith('visual-emitter-'));
  const visual=report.differences-physics.length;visualDifferences+=visual;physicsDifferences+=physics.length;comparedWords+=report.comparedWords;
  reports.push({frame,comparedWords:report.comparedWords,physicsDifferences:physics.length,visualDifferences:visual,firstPhysicsDifferences:physics.slice(0,20),firstVisualDifferences:report.allDifferences.filter(d=>d.object?.startsWith('visual-emitter-')).slice(0,20)});
  if(physics.length)break;
  let tickCount=0;
  while(events[eventIndex]?.frame===frame){
   const before=events[eventIndex++],next=events[eventIndex++];tickCount++;
   if(before.phase!=='before-rider'||next?.phase!=='after-rider'||next.frame!==frame||before.playerActive||next.playerActive||before.ownerGate||next.ownerGate||before.updateAddress!==0x43a0c0||next.updateAddress!==before.updateAddress||before.dtBits!==next.dtBits||before.paused!==next.paused||before.address!==events[0].address||next.address!==before.address||before.rider!==r.address||next.rider!==r.address)throw Error('Unexpected external rider event');
   external.context.paused=before.paused;
   try{advanceMcmRiderTick(external.context,bitsFloat(before.dtBits));}
   catch(error){if(!/requires free-rider integration|Free-rider integration is not connected/.test(error.message))throw error;pendingExternalTick={frame,reason:error.message};break;}
   const bytes=Buffer.from(before.riderHex,'hex');if(bytes.length!==0x3ac)throw Error('Wrong retained rider size');
   for(const [offset,values]of [[0x40,r.position],[0x4c,r.previousPosition],[0x58,r.velocity],[0x64,r.angular],[0x70,r.alternateVelocity],[0x7c,r.alternateAngular],[0xa0,r.center],[0xac,r.extents],[0xb8,r.matrix]])values.forEach((v,j)=>bytes.writeFloatLE(v,offset+j*4));
   for(const [offset,value]of [[0x138,r.field138],[0x13c,r.flag13c],[0x140,r.field140],[0x144,r.field144],[0x148,r.field148],[0x14c,r.field14c],[0x39c,r.field39c],[0x154,r.field154],[0x16c,c.rider.active16c],[0x170,c.rider.kind],[0x3a4,r.region]])bytes.writeUInt32LE(value>>>0,offset);
   c.rider.selected.forEach((v,j)=>bytes.writeUInt32LE(v>>>0,0x160+j*4));bytes.writeFloatLE(r.fieldf8,0xf8);
   const differences=[];let words=1;
   for(const [name,expected,hex]of [['rider',bytes,next.riderHex],['child',external.childBytes,next.hex]]){
    const original=Buffer.from(hex,'hex');if(original.length!==expected.length)throw Error('Wrong retained rider observation size');
    for(let o=0;o<original.length;o+=4){words++;if(original.readUInt32LE(o)!==expected.readUInt32LE(o))differences.push({object:name,offset:o,original:original.readUInt32LE(o),recovered:expected.readUInt32LE(o)});}
   }
   if(floatBits(external.context.globalDelta)!==next.globalDtBits)differences.push({object:'global-delta',original:next.globalDtBits,recovered:floatBits(external.context.globalDelta)});
   let particleErrors=0;const firstParticleDifferences=[];
   if(external.poolBytes){
    if(before.poolAddress!==events[0].poolAddress||next.poolAddress!==before.poolAddress)throw Error('Retained rider pool ownership differs');
    for(const [name,recovered,hex]of [['particle-pool',external.poolBytes,next.poolHex],['particles',external.particleBytes,next.particlesHex]]){
     const original=Buffer.from(hex,'hex');if(original.length!==recovered.length)throw Error('Wrong retained particle observation size');
     for(let o=0;o<original.length;o+=4){words++;particleComparedWords++;if(original.readUInt32LE(o)!==recovered.readUInt32LE(o)){particleErrors++;if(firstParticleDifferences.length<20)firstParticleDifferences.push({object:name,offset:o,original:original.readUInt32LE(o),recovered:recovered.readUInt32LE(o)});}}
    }
    particleDifferences+=particleErrors;visualDifferences+=particleErrors;
   }
   externalWords+=words;physicsDifferences+=differences.length;riderReports.push({frame,comparedWords:words,differences,...(external.poolBytes?{particleDifferences:particleErrors,firstParticleDifferences}:{})});if(differences.length)break;
  }
  if(pendingExternalTick||physicsDifferences)break;
  if(frame<rows.length/2-1&&tickCount!==1)throw Error('Missing or repeated external rider tick');
 }
 return {scope:'Retained modeled bike/rider state initialized once, using explicit throttle, optional captured brake responses and external rider timing/gates. Visual emitter differences remain reported separately. Unmodeled bytes use each observed entry as an unchanged-within-call baseline. External rider output checks cover rider/child/global delta and, when captured, the retained particle pool. Pool differences from unconnected shared-world updates remain reported as visual differences; not all transforms/world allocations are checked. This is not full trajectory parity.',bikeFrames:reports.length,riderTicks:riderReports.length,comparedWords,externalWords,particleComparedWords,particleDifferences,physicsDifferences,visualDifferences,pendingExternalTick,pendingBikeFrame,reports,riderReports};
}
