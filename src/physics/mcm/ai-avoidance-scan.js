import {floatBits,bitsFloat} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround,tau=f(2*Math.PI),half=f(Math.PI/2),limit=f(3*Math.PI/4),step=bitsFloat(0x3c8ef998);
const less=(a,b)=>a<b||Number.isNaN(a)||Number.isNaN(b);
const wrap=x=>{let y=f(x);if(x>Math.PI)y=f(sub(y,tau));if(!(y>-Math.PI))y=f(add(y,tau));return y;};
// Original 46e340..46e9c7, including the scan's speed fallback. Allocation,
// preceding heading override and subsequent control outputs are separate.
export function scanMcmAiAvoidance({heading,targetHeading,speedLimit,lateralError,threshold,range,x,z,player,firstActors,secondActors,head,nodes}){
 let speed=speedLimit,offset=0,flag=0,selected=0;
 const blocks=(record,candidate,current)=>{
  if(!record.active)return false;
  const diff=wrap(f(sub(candidate,record.heading)));
  return less(Math.abs(diff),limit)&&(less(Math.abs(diff),record.halfAngle)||less(Math.abs(wrap(sub(current,record.heading))),record.halfAngle));
 };
 while((floatBits(offset)|0)<0x3fc90fdb){
  const candidate=wrap(add(offset,targetHeading)),current=wrap(add(offset,heading));selected=candidate;let blocked=false;
  if(blocks(player,candidate,current)){blocked=true;flag=1;}
  for(const actor of firstActors)if(!actor.self&&blocks(actor.record,candidate,current)){blocked=true;flag=1;}
  // The original advances identities but reuses the FIRST record in this list.
  for(const actor of secondActors)if(!actor.self&&blocks(secondActors[0].record,candidate,current)){blocked=true;flag=1;}
  if((floatBits(threshold)|0)>0&&!less(Math.abs(lateralError),threshold)){
   let address=head;const visited=new Set();
   while(address){
    if(visited.has(address))throw Error('Cyclic AI avoidance route');visited.add(address);
    const node=nodes.get(address);if(!node)throw Error('Missing AI avoidance route node');
    if([3,4,5,6].includes(node.kind)){
     const dx=f(sub(node.x,x)),dz=f(sub(node.z,z));
     if(mul(range,range)>add(mul(dx,dx),mul(dz,dz))&&less(Math.abs(wrap(sub(Math.atan2(dx,dz),candidate))),half)){blocked=true;flag=2;}
    }
    address=node.next;
   }
  }
  if(!blocked)break;offset=(floatBits(offset)|0)>0?f(-offset):f(sub(step,offset));
 }
 if(Math.abs(offset)>half){selected=targetHeading;speed=flag===1?30:40;}
 return {selectedHeading:selected,steeringDifference:wrap(sub(selected,heading)),speedLimit:speed,offset,flag};
}
