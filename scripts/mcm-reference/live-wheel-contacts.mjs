import {checkpointMemory,loadLiveVisuals} from './live-checkpoint.mjs';
import {decodeFrameStack} from './decode-frame-stack.mjs';

// Nested contact-routine scratch is not in the caller's stack capture. A valid
// terrain query overwrites it; reject any path that tries to consume its seed.
const unavailableNormal={*[Symbol.iterator](){throw Error('Uncaptured nested normal scratch was read');}};
export function loadLiveWheelContacts(checkpoint,row,terrain,{visuals,dt,componentRate}={}){
 if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(componentRate))throw Error('Explicit contact timing/steering required');
 const m=checkpointMemory(checkpoint),b=checkpoint.bikeAddress,stack=decodeFrameStack(row);
 if(row.phase!=='before-update'||row.pass!==0||row.playerFrame!==0||parseInt(row.bike,16)!==b||m.read(b,0xcc8).toString('hex')!==row.stateHex)throw Error('Contact checkpoint boundary differs');
 if(m.u32(b+0x844))throw Error('Unsupported crashed contact initializer');
 if(!terrain.root||!Number.isFinite(terrain.heightScale)||!Number.isFinite(terrain.worldToGrid))throw Error('Verified terrain geometry required');
 visuals??=loadLiveVisuals(checkpoint,{extraRoots:[m.u32(m.u32(b+0x8ec)+0x50)]});
 const node=p=>{const n=visuals.nodes.get(p);if(!n)throw Error('Contact node missing from graph');return n;};
 const front=m.u32(b+0x8dc),rear=m.u32(b+0x8e0),component=m.u32(b+0x8ec),vec=(address,offset)=>[0,4,8].map(i=>m.f32(address+offset+i));
 return {visuals,stack,componentAddress:component,context:{terrain,dt:Math.fround(dt),componentRate:Math.fround(componentRate),state844:0,
  node:node(m.u32(component+0x50)),bodyNode:node(m.u32(b+0x434)),frontNode:node(m.u32(front)),rearNode:node(m.u32(rear)),
  points:stack.points,heights:[m.f32(b+0x590),m.f32(b+0x594)],radius:m.f32(front+0x44),rearRadius:m.f32(rear+0x44),
  bikeForward:vec(b,0x4c0),bikeUp:vec(b,0x4cc),pitch:m.f32(b+0x4dc),heading:m.f32(b+0x4e0),sinRoll:m.f32(b+0x4e4),
  componentAxis:vec(component,0x54),componentAngle:m.f32(component+0x44),cooldown:m.f32(b+0x888),cooldownFlag:m.u32(b+0x8ac),field6b0:m.f32(b+0x6b0),
  tangent:vec(b,0x578),rearTangent:vec(b,0x584),normal:vec(b,0x54c),offset:vec(b,0x540),
  resampleNormal:unavailableNormal,rearResampleNormal:unavailableNormal,probeNormals:[unavailableNormal,unavailableNormal],refinedNormals:[unavailableNormal,unavailableNormal]}};
}
