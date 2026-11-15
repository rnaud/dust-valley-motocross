import {floatBits as bits} from './math.js';
const f=Math.fround;
// Original 0x46d535..0x46d707. Route arrays contain node word8 as floats.
// Preserve signed integer wrap and the original signed FLOAT-BITS branch.
export function computeMcmAiRaceHandicap(c){
 let progress=c.initialProgress,distance=c.minDistance;
 const difference=()=>((Math.imul((c.lap-c.otherLap)|0,c.routeCount)-c.otherIndex)+c.index)|0;
 if(c.raceActive){
  if(c.lap>0||c.index>c.maxProgress){
   const raw=difference();progress=f(raw);
   if(raw>c.maxProgress)progress=c.maxProgress;else if(c.minProgress>progress)progress=c.minProgress;
   progress=(bits(progress)|0)>0?f(progress/c.maxProgress):-f(progress/c.minProgress);
  }
  if(c.lap>0||c.currentDistance>c.maxDistance){
   const d=difference();
   if(d>=c.routeCount)distance=c.maxDistance;
   else if(d<=(-c.routeCount|0))distance=c.minDistance;
   else {const i=d<0?c.index:c.otherIndex;distance=f(c.otherRoute[i]-c.route[i]);}
   if(c.maxDistance<distance)distance=c.maxDistance;else if(c.minDistance>distance)distance=c.minDistance;
  }
 }
 const scale=c.raceActive?f((distance-c.minDistance)*((c.maxScale-c.minScale)/(c.maxDistance-c.minDistance))+c.minScale):1;
 return {progress,distance,scale};
}
