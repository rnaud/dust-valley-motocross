import {loadLiveFrameBootstrap} from './live-frame-bootstrap.mjs';
import {compareLiveFrameReturn} from './compare-live-frame-tires.mjs';

// One initialization, with only scripted driver input supplied on later frames.
// Do not copy observed emitter/rider changes into the running simulation.
export function compareLiveRetainedFrames(inputs,rows){
 if(!rows.length||rows.length%2)throw Error('Expected complete entry/return pairs');
 const loaded=loadLiveFrameBootstrap({...inputs,row:rows[0]}),reports=[];
 for(let i=0;i<rows.length;i+=2){
  const row=rows[i],after=rows[i+1],frame=i/2;
  if(row.phase!=='before-update'||row.playerFrame!==frame||row.pass!==0||row.bike!==rows[0].bike||
    ![0,1].includes(row.requestedThrottle))throw Error('Retained capture sequence differs');
  loaded.context.engineEntry.input.throttleResponses[0]=row.requestedThrottle;
  const report=compareLiveFrameReturn({...inputs,row},after,{loaded,retained:true});
  reports.push({frame,...report});
  if(report.differences)break;
 }
 return {scope:'Retained modeled bike state, initialized once. Only explicit throttle input changes between frames. Unmodeled bytes are assumed unchanged within each frame using its observed entry bytes; this is not a complete world replay. Visual/animation allocations are compared only at boundaries containing them. External rider and emitter ticks are not substituted.',
  frames:reports.length,comparedWords:reports.reduce((n,r)=>n+r.comparedWords,0),differences:reports.reduce((n,r)=>n+r.differences,0),reports};
}
