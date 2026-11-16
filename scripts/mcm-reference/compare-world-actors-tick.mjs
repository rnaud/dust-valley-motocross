import {tickMcmWorldActors} from '../../src/physics/mcm/world-actors-tick.js';import {bitsFloat,floatBits} from '../../src/physics/mcm/math.js';
export function compareWorldActorsTick(input,output){
 if(input.length%116||output.length!==input.length/116*1044)throw Error('Invalid world corpus sizes');
 const differences=[];let commands=0;
 for(let row=0;row<input.length/116;row++){
  const b=input.subarray(row*116,(row+1)*116),u=i=>b.readUInt32LE(i*4),log=[],actual=Buffer.alloc(1044);
  const bikes=Array.from({length:8},(_,i)=>({id:i+1}));bikes[0].position504=[16,17,18].map(i=>bitsFloat(u(i)));bikes[0].excluded=u(3);
  const c={world:{menu:u(1),paused:u(2),refresh:u(4),aiCount:u(8),remoteCount:u(9)|0,network:u(10),raceKind:u(12),remoteIds:[20,21,22,23].map(u)},view:{target:bikes[0]},player:bikes[0],ai:bikes.slice(1,4),remote:[24,25,26,27].map((k,i)=>u(k)?bikes[4+i]:null),running:u(5),countdownBits:u(6),stopRequested:u(7),raceEnabled:u(13),marker:u(14)?{enabled:u(15)}:null,localIdentityScratch:u(19)};
  const services={select(c,v){log.push([1,v,0,0]);},refresh(b){log.push([2,b.id,0,0]);},physics(b,dt){log.push([3,b.id,floatBits(dt),0]);if(u(28)&&b===bikes[0])c.stopRequested=1;},presentation(b,dt){log.push([4,b.id,floatBits(dt),0]);},localIdentity(network){log.push([5,network,u(11),0]);return u(11);},remote(b,dt){log.push([6,b.id,floatBits(dt),0]);},race(b,dt){log.push([7,b.id,floatBits(dt),0]);},raceWorld(){log.push([8,0,0,0]);},marker(m,p){log.push([9,...p.map(floatBits)]);},children(c,dt){log.push([10,floatBits(dt),0,0]);}};
  const result=tickMcmWorldActors(c,bitsFloat(u(0)),services);[result,c.running,c.countdownBits,c.stopRequested,log.length,...log.flat()].forEach((v,i)=>actual.writeUInt32LE(v>>>0,i*4));commands+=log.length;
  for(let i=0;i<261;i++){const a=actual.readUInt32LE(i*4),e=output.readUInt32LE(row*1044+i*4);if(a!==e)differences.push({case:row,word:i,actual:a,expected:e});}
 }
 return {cases:input.length/116,words:output.length/4,commands,differences};
}
