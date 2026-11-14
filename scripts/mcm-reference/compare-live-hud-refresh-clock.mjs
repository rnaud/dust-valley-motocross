import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {tickMcmHudRefreshClock} from '../../src/physics/mcm/hud-refresh-clock.js';
import {bitsFloat,floatBits} from '../../src/physics/mcm/math.js';
export function compareLiveHudRefreshClock(rows){
 if(!rows.length||rows.length%2)throw Error('Incomplete live HUD clock capture');
 for(const row of rows)for(const key of ['frame','owner','elapsedBits','frames','frameMillisecondsBits','dtBits','enabled','scratchAddress','scratchBits'])if(!Number.isInteger(row[key])||row[key]<0||row[key]>0xffffffff)throw Error('Invalid live HUD clock word');
 const first=rows[0],clock={elapsed:bitsFloat(first.elapsedBits),frames:first.frames,frameMilliseconds:bitsFloat(first.frameMillisecondsBits)};
 let refreshes=0,changedScratchWords=0;const differences=[],scratchChanges=[];
 const check=(row,frame,phase)=>{const actual=[floatBits(clock.elapsed),clock.frames,floatBits(clock.frameMilliseconds)],expected=[row.elapsedBits,row.frames,row.frameMillisecondsBits];for(let word=0;word<3;word++)if(actual[word]!==expected[word])differences.push({frame,phase,word,actual:actual[word],expected:expected[word]});};
 for(let i=0;i<rows.length;i+=2){
  const before=rows[i],after=rows[i+1],frame=i/2;
  if(before.phase!=='before'||after.phase!=='after'||before.frame!==frame||after.frame!==frame||before.owner!==first.owner||after.owner!==first.owner||before.dtBits!==after.dtBits||before.enabled!==after.enabled||before.scratchAddress!==after.scratchAddress)throw Error('Live HUD clock sequence differs');
  check(before,frame,'before');
  const refreshed=tickMcmHudRefreshClock(clock,{dt:bitsFloat(before.dtBits),enabled:before.enabled});
  if(refreshed)refreshes++;
  check(after,frame,'after');
  if(before.scratchAddress&&before.scratchBits!==after.scratchBits){changedScratchWords++;scratchChanges.push({frame,refreshed,address:before.scratchAddress,before:before.scratchBits,after:after.scratchBits});}
 }
 return {scope:'HUD clock initialized once, consuming captured world deltas and enabled gates. Graphics execution and inherited bike scratch remain observed only, not simulated.',frames:rows.length/2,comparedWords:rows.length*3,predictedRefreshes:refreshes,changedScratchWords,scratchChanges,differences};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=compareLiveHudRefreshClock(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse));console.log(JSON.stringify(r,null,2));if(r.differences.length)process.exitCode=1;}
