import {mcmSubtract as sub,mcmAdd as add} from './x87-arithmetic.js';
const f=Math.fround,pi=Math.PI,tau=f(2*pi),halfPi=f(pi/2),quarterPi=f(pi/4);
const unordered=(a,b)=>Number.isNaN(a)||Number.isNaN(b);
const equal=(a,b)=>a===b||unordered(a,b);
function wrapDifference(a,b){
 const difference=sub(a,b);let angle=f(difference);
 if(difference>pi)angle=f(sub(angle,tau));
 if(angle<=-pi||Number.isNaN(angle))angle=f(add(angle,tau));
 return angle;
}
// Original 0x46d707..0x46dac1, including modes 1 and 2. The nearest result is computed
// by ai-route-nearest; this advances the retained target, not the nearest node.
export function advanceMcmAiRouteTarget({mode=0,head,nodes,table,nearest,index,reference,x,y,z,heading,fieldBB8,fieldC3C}){
 mode&=65535;
 if(!table?.length||!nodes||!nearest)throw Error('Missing AI route inputs');
 const count=table.length;let address=table[index],difference=(nearest.index-reference)|0;
 if(difference>=((count-2)|0))difference=(difference-count)|0;
 else if(difference<=((2-count)|0))difference=(difference+count)|0;
 const absolute=((difference^(difference>>31))-(difference>>31))|0;
 if(mode!==1&&absolute<=2&&index!==0){index=nearest.index;address=nearest.address;}
 const seen=new Set();let advances=0;
 for(;;){
  const key=address+':'+index+':'+fieldC3C;if(seen.has(key))throw Error('Nonterminating AI target cycle');seen.add(key);
  const node=nodes.get(address);if(!node)throw Error('Missing AI target node');
  const nextAddress=node.next||head,next=nodes.get(nextAddress);if(!next)throw Error('Missing AI target successor');
  const targetHeading=f(Math.atan2(sub(node.x,x),sub(node.z,z)));
  const segmentHeading=equal(next.z,node.z)&&equal(next.x,node.x)?f(add(heading,f(pi))):f(Math.atan2(sub(next.x,node.x),sub(next.z,node.z)));
  let routeDifference=mode===0?0:(index-reference)|0;
  if(mode!==0){if(routeDifference>=((count-2)|0))routeDifference=(routeDifference-count)|0;else if(routeDifference<=((2-count)|0))routeDifference=(routeDifference+count)|0;}
  let advance;
  if(mode===1)advance=fieldC3C===2;
  else if(routeDifference>2)advance=false;
  else if(!fieldBB8)advance=sub(node.y,y)>10;
  else{
   const first=Math.abs(wrapDifference(segmentHeading,targetHeading));
   const second=Math.abs(wrapDifference(segmentHeading,heading));
   const third=Math.abs(wrapDifference(targetHeading,heading));
   advance=first>quarterPi&&(second<halfPi||Number.isNaN(second))&&third>quarterPi;
  }
  if(!advance){
   // Original rewind changes target/index only; successor and headings stay stale.
   if(routeDifference>2&&mode!==1){index=reference;address=table[index];if(address===undefined)throw Error('Missing AI reference target');}
   return {address,next:nextAddress,index,fieldC3C,targetHeading,segmentHeading,routeDifference,advances};
  }
  if(fieldC3C===2)fieldC3C=0;
  index=(index+1)|0;if(index>=count)index=0;
  address=nextAddress;advances++;
 }
}
