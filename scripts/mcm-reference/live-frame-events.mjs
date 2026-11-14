import {loadLiveRider} from './live-checkpoint.mjs';
import {createMcmRandom,connectMcmRandom} from '../../src/physics/mcm/random.js';

// Extend the shared context only when event dependencies were observed at the
// same boundary. This deliberately leaves uncaptured trick/nearby assets absent.
export function connectLiveFrameEvents(c,{checkpoint,memory:m,animation,environment:env,row,strict}){
 if(env.terrainMode===null)return null;
 if(!env.actions)throw Error('Event continuation requires captured actions');
 const a=checkpoint.bikeAddress,b=c.bike,p=c.contactPhase;
 const frame=animation.assets.frames.get(m.u32(a+0x23c));
 if(!frame)throw Error('Event continuation requires captured bounds frame');
 const children=[];for(let child=frame.firstChild;child;child=child.next)children.push(child);
 c.bounds={min:frame.boundsMin,max:frame.boundsMax,components:animation.visuals.bike.components.map(v=>v.node),children,count:children.length};
 c.effect=[0,4,8,12].map(o=>m.f32(m.u32(a+0x904)+o));
 for(const o of [0x8b8,0x8a4,0x878,0x880,0x618,0x72c])b[`field${o.toString(16)}`]=m.u32(a+o);
 for(const o of [0x86c,0x868,0x864,0x890,0x708,0x704,0x71c,0x720,0x728,0x734,0x6e8,0x6ec])b[`field${o.toString(16)}`]=m.f32(a+o);
 for(const [name,offset] of [['spawnPosition',0xbc0],['savedHeading',0x898],['boundsMin',0x218],['boundsMax',0x224]])b[name]=[0,4,8].map(o=>m.f32(a+offset+o));
 c.loopRider.animationFrame=animation.context.bikeAnimation.frame.index;
 c.loopRider.buttons=[9,6,7].map(action=>env.actions[action]);
 p.normalEventDecision=strict({inputPresent:+!!env.controllerAddress,inputResult:env.actions[8],terrainMode:env.terrainMode,
  get otherSpeed(){if(b.field8b0)throw Error('Other-bike event state not connected');return 0;}},'normalEventDecision');
 p.normalEventSetup.records=loadLiveRider(checkpoint).records;
 // The event helper accepts either a recorded sequence or the shared stream.
 p.normalEventSetup.randomValues=undefined;
 p.normalEventJoin=strict({},'normalEventJoin');
 if(!Number.isInteger(row.randomState))throw Error('Captured random stream required');
 const random=createMcmRandom(row.randomState);connectMcmRandom(c,random);
 return random;
}
