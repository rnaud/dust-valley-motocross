import {checkpointMemory,loadLiveEngine,loadLiveVisuals} from './live-checkpoint.mjs';
const f=Math.fround;
export function loadLiveSuspension(checkpoint,visuals=loadLiveVisuals(checkpoint)){
 const m=checkpointMemory(checkpoint),bike=checkpoint.bikeAddress,node=p=>{const n=visuals.nodes.get(p);if(!n)throw Error('Suspension node missing from visual graph');return n;};
 const front=m.u32(bike+0x8e4),rear=m.u32(bike+0x8e8);
 m.read(front,0x60);m.read(rear,0x60);
 return {frontAddress:front,rearAddress:rear,visuals,suspension:{front:{node:node(m.u32(front)),limited:m.u32(front+0x44)},
  rear:{node:node(m.u32(rear)),limited:m.u32(rear+0x44),restLocal:Array.from({length:16},(_,i)=>m.f32(rear+4+i*4))},positionNode:node(m.u32(bike+0xcc4))}};
}
// Initial local digital-input branch. Controller responses are explicit inputs;
// this is not a substitute for loading AI, scripted or analog controllers.
export function loadLiveSubstepStart(checkpoint,{dt=.02,throttle=0,brake=0,visuals}={}){
 if(!Number.isFinite(dt)||dt<=0)throw Error('Invalid substep interval');
 const {engine,memory:m,address:engineAddress}=loadLiveEngine(checkpoint),bike=checkpoint.bikeAddress;
 for(const o of [0x844,0x614,0x618,0x6f8,0xc68,0xb04,0xb08])if(m.u32(bike+o))throw Error('Unsupported live substep controller/state');
 const loaded=loadLiveSuspension(checkpoint,visuals),filter=m.u32(bike+0x8fc),vec=o=>[0,4,8].map(i=>m.f32(bike+o+i));
 const context={engine,suspension:loaded.suspension,dt:f(dt),inverseDt:f(1/f(dt)),state844:0,aiThrottle:0,aiBrake:0,analog:-1,
  input:{presentMask:1,brakeResponses:[+!!brake,0,0,0,0,0],throttleResponses:[+!!throttle,0,0,0,0,0]},
  mass:m.f32(bike+0x558),inverseMass:m.f32(bike+0x55c),field694:m.f32(bike+0x694),brake:m.f32(bike+0x5e4),
  previousSpeed:m.f32(bike+0x564),speed:m.f32(bike+0x6a4),velocity:vec(0x510),previousY:m.f32(bike+0x84c),filteredAcceleration:m.f32(bike+0x848),
  accelerationFilter:{value:m.f32(filter),duration:m.f32(filter+4)},referencePosition:vec(0x504)};
 return {...loaded,context,engineAddress,filterAddress:filter};
}
