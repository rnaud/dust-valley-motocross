import {mcmSubtract as sub,mcmMultiply as mul,mcmAdd as add} from './x87-arithmetic.js';

// Original 0x46d3c2..0x46d439. Compare the unrounded squared distance with
// the stored float minimum, then round only when replacing that minimum.
// This is route selection only; the full AI controller remains unsupported.
export function findMcmNearestAiRoute({head,nodes,x,z}){
 let address=head>>>0,best=address,index=0,bestIndex=0,distance=Math.fround(1000000);
 const visited=new Set();
 while(address){
  if(visited.has(address))throw Error('Cyclic AI route');visited.add(address);
  const node=nodes.get(address);if(!node)throw Error('Missing AI route node');
  const dz=sub(node.z,z),dx=sub(node.x,x),candidate=add(mul(dz,dz),mul(dx,dx));
  // FCOM C0 is set for both less-than and unordered (NaN).
  if(candidate<distance||Number.isNaN(candidate)||Number.isNaN(distance)){distance=Math.fround(candidate);best=address;bestIndex=index;}
  address=node.next>>>0;index++;
 }
 return {address:best,index:bestIndex,distance};
}
