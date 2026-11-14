import {loadLiveCollisionDispatch} from './live-collision-dispatch.mjs';
import {respondMcmDynamicCollision} from '../../src/physics/mcm/dynamic-collision-response.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function compareLiveCollisionResponse(checkpoint,observation,output){
 if(!observation.transformsCaptured)throw Error('Captured actor transforms required');
 const w=loadLiveCollisionDispatch(checkpoint,observation),bike=w.actors.get(checkpoint.bikeAddress),collision=bike.collision;
 if(collision.owner!==0||collision.other?.collisionClass!==1)throw Error('Expected player bike/rider response');
 const other=w.actors.get(collision.other.ownerAddress).bike,m=w.memory;
 for(const a of w.actors.values())if(a.kind==='bike'){
  for(const [key,offset] of [['field8a8',0x8a8],['field618',0x618],['field8ac',0x8ac]])a[key]=m.u32(a.address+offset);
  for(const [key,offset] of [['heading',0x4e0],['restitution',0x5e0],['speed',0x6a4]])a[key]=m.f32(a.address+offset);
  a.scratch540=[0,4,8].map(i=>m.f32(a.address+0x540+i));a.field654=[0,4,8].map(i=>m.f32(a.address+0x654+i));
 }
 const boundary=[0,0,0],stop=Symbol('notification');
 try{respondMcmDynamicCollision({bike,other,collision,collisionType:1,notify(b,impulse,type){boundary.splice(0,3,1,floatBits(impulse),type);throw stop;}});}catch(error){if(error!==stop)throw error;}
 if(!boundary[0])throw Error('Notification boundary not reached');
 const blocks=observation.blocks.map(b=>({...b,bytes:Buffer.from(b.hex,'hex')}));
 if(output.length!==12+blocks.reduce((n,b)=>n+b.size,0))throw Error('Wrong response oracle output length');
 const put=(a,v)=>{const b=blocks.find(b=>a>=b.address&&a+4<=b.address+b.size);if(!b)throw Error('Uncaptured response store');b.bytes.writeUInt32LE(v>>>0,a-b.address);},vector=(a,v)=>v.forEach((x,i)=>put(a+i*4,floatBits(x)));
 for(const a of w.actors.values())if(a.kind==='bike')for(const [key,offset] of [['position',0x4f8],['velocity',0x510],['angularVelocity',0x534],['worldAngularVelocity',0x528],['scratch540',0x540],['field654',0x654]])vector(a.address+offset,a[key]);
 for(const n of w.transformNodes.values()){vector(n.address+0x84,n.local);vector(n.address+0xc4,n.world);put(n.address+0x104,n.cacheValid);}
 let differences=0,changedWords=0,comparedWords=0,cursor=12;const firstDifferences=[];
 const check=(actual,expected,field)=>{comparedWords++;if(actual!==expected){differences++;if(firstDifferences.length<20)firstDifferences.push({field,original:expected,recovered:actual});}};
 boundary.forEach((v,i)=>check(v,output.readUInt32LE(i*4),`boundary[${i}]`));
 for(const b of blocks){const before=Buffer.from(b.hex,'hex');for(let i=0;i<b.size;i+=4){const original=output.readUInt32LE(cursor+i);if(original!==before.readUInt32LE(i))changedWords++;check(b.bytes.readUInt32LE(i),original,`0x${(b.address+i).toString(16)}`);}cursor+=b.size;}
 return {scope:'Original type-1 dynamic response from captured player collider, stopping before notification at 0x49e37f. Callback gating, notification, subsequent grid refresh and full trajectories excluded.',actors:w.actors.size,transformNodes:w.transformNodes.size,comparedWords,changedWords,differences,firstDifferences,boundary};
}
