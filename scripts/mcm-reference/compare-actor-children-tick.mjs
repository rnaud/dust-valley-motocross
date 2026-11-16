import {tickMcmActorChildren} from '../../src/physics/mcm/actor-children-tick.js';
export function compareActorChildrenTick(input,output){
 if(input.length%140||output.length!==input.length/140*1216)throw Error('Invalid actor corpus sizes');
 const differences=[];let commands=0;
 for(let row=0;row<input.length/140;row++){
  const b=input.subarray(row*140,(row+1)*140),u=i=>b.readUInt32LE(i*4),actual=Buffer.alloc(1216),log=[];
  const world={gate:u(3),flag:u(6),last:u(7),maximum:u(8),elapsed:0,display:1},parent={token:7,owner:u(2)?{world,device:u(4)?{enabled:u(5)}:null}:null};
  const nodes=Array.from({length:6},(_,i)=>({token:i+1,parent,enabled:u(11+i*4),paused:u(12+i*4),removed:u(13+i*4)}));
  nodes.forEach((n,i)=>{n.previous=i&&i<u(0)?nodes[i-1]:null;n.next=i+1<u(0)?nodes[i+1]:null;});parent.first=u(0)?nodes[0]:null;
  const services={destroy(n){log.push([2,n.token,parent.first?.token??0,0]);},update(n,dt){const behavior=u(14+(n.token-1)*4);log.push([1,n.token,dt,behavior]);if(behavior===1&&n.next)n.next.removed=1;if(behavior===2&&n.next)n.next.enabled=0;if(behavior===3)world.gate=0;},poll(display,zero,flag){if(display!==1)throw Error('Display identity');log.push([3,zero,flag,u(10)]);return u(10);},clock(){log.push([4,u(9),0,0]);return u(9);}};
  const result=tickMcmActorChildren(parent,u(1),services),words=[result,parent.first?.token??0,world.gate,world.last,world.elapsed,world.maximum,...nodes.flatMap(n=>[n.previous?.token??0,n.next?.token??0,n.parent.token,n.enabled,n.paused,n.removed])];
  words.forEach((v,i)=>actual.writeUInt32LE(v>>>0,i*4));actual.writeUInt32LE(log.length,47*4);log.flat().forEach((v,i)=>actual.writeUInt32LE(v>>>0,(48+i)*4));commands+=log.length;
  for(let i=0;i<304;i++){const a=actual.readUInt32LE(i*4),e=output.readUInt32LE(row*1216+i*4);if(a!==e)differences.push({case:row,word:i,actual:a,expected:e});}
 }
 return {cases:input.length/140,words:output.length/4,commands,differences};
}
