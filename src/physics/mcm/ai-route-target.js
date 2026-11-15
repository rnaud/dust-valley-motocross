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
// Original 0x46d707..0x46dac1, mode 0 path. The nearest result is computed
// by ai-route-nearest; this advances the retained target, not the nearest node.
export function advanceMcmAiRouteTarget({mode=0,head,nodes,table,nearest,index,reference,x,y,z,heading,fieldBB8,fieldC3C}){
 if(mode!==0)throw Error('Unsupported AI target mode');
 const count=table.length;let address=table[index],difference=(nearest.index-reference)|0;
 if(difference>=((count-2)|0))difference=(difference-count)|0;
 else if(difference<=((2-count)|0))difference=(difference+count)|0;
 const absolute=((difference^(difference>>31))-(difference>>31))|0;
 if(absolute<=2&&index!==0){index=nearest.index;address=nearest.address;}
 const seen=new Set();let advances=0;
 for(;;){
  const key=address+':'+index;if(seen.has(key))throw Error('Nonterminating AI target cycle');seen.add(key);
  const node=nodes.get(address);if(!node)throw Error('Missing AI target node');
  const nextAddress=node.next||head,next=nodes.get(nextAddress);if(!next)throw Error('Missing AI target successor');
  const targetHeading=f(Math.atan2(sub(node.x,x),sub(node.z,z)));
  const segmentHeading=equal(next.z,node.z)&&equal(next.x,node.x)?f(add(heading,f(pi))):f(Math.atan2(sub(next.x,node.x),sub(next.z,node.z)));
  let advance;
  if(!fieldBB8)advance=sub(node.y,y)>10;
  else{
   const first=Math.abs(wrapDifference(segmentHeading,targetHeading));
   const second=Math.abs(wrapDifference(segmentHeading,heading));
   const third=Math.abs(wrapDifference(targetHeading,heading));
   advance=first>quarterPi&&(second<halfPi||Number.isNaN(second))&&third>quarterPi;
  }
  if(!advance)return {address,next:nextAddress,index,fieldC3C,targetHeading,segmentHeading,routeDifference:0,advances};
  if(fieldC3C===2)fieldC3C=0;
  index=(index+1)|0;if(index>=count)index=0;
  address=nextAddress;advances++;
 }
}
