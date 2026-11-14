import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {compareLiveHudRefreshClock} from './compare-live-hud-refresh-clock.mjs';
import {tickMcmHudRefreshClock} from '../../src/physics/mcm/hud-refresh-clock.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';

// Classify observations, never feed observed scratch back into recovered physics.
export function analyzeWorldStackOrder(rows){
 if(!rows.length)throw Error('Empty ordered capture');
 const phases=new Set(['bike-entry','bike-before','bike-after','before','after','draw-before','draw-after']);
 let entry=null,bike=null,hud=null,draw=null,playerUpdates=0,aiUpdates=0,drawCalls=0,drawClears=0;
 const clocks=[],transitions={},unresolved=[],drawsPerRefresh=[];
 let clock;
 for(let i=0;i<rows.length;i++){
  const row=rows[i];
  if(row.sequence!==i||!phases.has(row.phase))throw Error('Invalid ordered sequence');
  for(const key of ['frame','scratchAddress','scratchBits'])if(!Number.isInteger(row[key])||row[key]<0||row[key]>0xffffffff)throw Error('Invalid capture word');
  if(i&&rows[i-1].scratchAddress&&row.scratchAddress!==rows[i-1].scratchAddress)throw Error('Scratch address changed');
  if(row.phase==='bike-entry'){
   if(entry||bike||hud||draw)throw Error('Unexpected bike entry');entry=row;
  }else if(row.phase==='bike-before'){
   if(!entry||entry.bike!==row.bike||entry.ai!==row.ai||entry.esp-row.esp!==0xbf8)throw Error('Unpaired bike prologue');entry=null;
   if(bike||hud||draw)throw Error('Unexpected bike nesting');bike=row;
   if(row.ai)aiUpdates++;else playerUpdates++;
  }else if(row.phase==='bike-after'){
   if(!bike||bike.bike!==row.bike||bike.ai!==row.ai||bike.esp!==row.esp)throw Error('Unpaired bike boundary');bike=null;
  }else if(row.phase==='before'){
   if(hud||bike||draw)throw Error('Unexpected HUD nesting');hud={row,draws:0};clocks.push(row);
   clock??={elapsed:bitsFloat(row.elapsedBits),frames:row.frames,frameMilliseconds:bitsFloat(row.frameMillisecondsBits)};
   hud.predicted=tickMcmHudRefreshClock(clock,{dt:bitsFloat(row.dtBits),enabled:row.enabled});
  }else if(row.phase==='after'){
   if(!hud||draw||hud.row.frame!==row.frame)throw Error('Unpaired HUD boundary');
   if(hud.predicted!==(hud.draws>0))throw Error('Predicted refresh differs from observed drawing');
   if(hud.draws)drawsPerRefresh.push(hud.draws);clocks.push(row);hud=null;
  }else if(row.phase==='draw-before'){
   if(!hud||draw)throw Error('Unexpected drawing boundary');draw=row;
  }else{
   if(!draw||!hud||row.esp!==draw.esp+20)throw Error('Unpaired DrawText return');
   if(row.scratchBits!==0)throw Error('DrawText did not clear observed slot');
   if(draw.scratchBits!==0)drawClears++;drawCalls++;hud.draws++;draw=null;
  }
  const prev=rows[i-1];
  if(prev&&prev.scratchAddress&&prev.scratchBits!==row.scratchBits){
   const key=`${prev.phase} -> ${row.phase}`;transitions[key]=(transitions[key]||0)+1;
   if(!(prev.phase==='bike-before'&&row.phase==='bike-after')&&!(prev.phase==='draw-before'&&row.phase==='draw-after'))unresolved.push({sequence:i,from:prev.phase,to:row.phase,before:prev.scratchBits,after:row.scratchBits});
  }
 }
 if(entry||bike||hud||draw||rows.at(-1).phase!=='after')throw Error('Incomplete ordered capture');
 const clockComparison=compareLiveHudRefreshClock(clocks);
 if(clockComparison.differences.length)throw Error('Retained HUD clock differs');
 return {scope:'Read-only ordered observations; unresolved intervals are not modeled or injected.',events:rows.length,playerUpdates,aiUpdates,drawCalls,drawClears,drawsPerRefresh,clockComparison,transitions,unresolvedIntervals:unresolved.length,unresolvedExamples:unresolved.slice(0,8)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeWorldStackOrder(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
