import {compareBikeReplay} from './compare-bike.mjs';
import {checkpointMemory} from './live-checkpoint.mjs';
// Local-state equality is required; it does not imply an identical world,
// animation resource state, stack, or CPU register checkpoint.
export function compareReplayTimingExperiment({source,observed,fixed}){
 checkpointMemory(source);
 for(const run of [observed,fixed]){
  checkpointMemory(run.checkpoint);
  if(run.checkpoint.bikeAddress!==source.bikeAddress||JSON.stringify(run.checkpoint.blocks)!==JSON.stringify(source.blocks))throw Error('Experiment local checkpoints differ');
  const bike=source.blocks.find(b=>b.address===source.bikeAddress);
  for(const pass of [0,1]){
   const row=run.rows.find(r=>r.pass===pass);
   if(!row||row.phase!=='before-update'||row.playerFrame!==0||row.stateHex!==bike.hex)throw Error('Experiment initial bike state differs');
  }
 }
 const a=compareBikeReplay(observed.rows),b=compareBikeReplay(fixed.rows);
 if(a.riderTiming?.fixed!==false||b.riderTiming?.fixed!==true)throw Error('Experiment timing protocols differ');
 const summarize=(r,rows)=>{
  const firstRider=Object.entries(r.differingRiderWords).sort((a,b)=>a[1].firstFrame-b[1].firstFrame)[0];
  return {framesPerPass:r.framesPerPass,firstMotionDifference:r.firstMotionDifference?{frame:r.firstMotionDifference.frame,phase:r.firstMotionDifference.phase,fields:r.firstMotionDifference.fields}:null,
   firstRiderDifference:firstRider?{offset:firstRider[0],...firstRider[1]}:null,
   firstRandomDifference:r.randomStateDifferences[0]??null,randomDifferenceCount:r.randomStateDifferences.length,
   differingBikeWords:r.differingBikeWords,differingEngineWords:r.differingEngineWords,differingRiderWords:r.differingRiderWords,differingStackWordCount:Object.keys(r.differingStackWords).length,
   timing:{fixed:r.riderTiming.fixed,passes:r.riderTiming.passes,differences:r.riderTiming.differences.length},
   crashedBoundaries:[0,1].map(pass=>rows.filter(row=>row.pass===pass&&Buffer.from(row.stateHex,'hex').readUInt32LE(0x844)).length)};
 };
 return {scope:'Same partial local checkpoint, different timing protocols. World, resources and caller stack are not restored. Not recovered full-bike parity.',checkpointBlocks:source.blocks.length,observed:summarize(a,observed.rows),fixed:summarize(b,fixed.rows)};
}
