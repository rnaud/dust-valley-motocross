import {loadLiveCollisionDispatch} from './live-collision-dispatch.mjs';
import {respondMcmRiderCrashContact} from '../../src/physics/mcm/rider-collision-response.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function compareLiveRiderResponse(checkpoint,observation,output){
 const w=loadLiveCollisionDispatch(checkpoint,observation),m=w.memory,c=w.objects[1],a=w.actors.get(c.ownerAddress);
 if(!w.riderResponse||!observation.transformsCaptured||a.kind!=='rider'||![0,1].includes(c.other?.collisionClass))throw Error('Captured rider response dependencies required');
 const v=(offset,n=3)=>Array.from({length:n},(_,i)=>m.f32(a.address+offset+i*4));
 const rider={velocity:v(0x58),angular:v(0x64),matrix:v(0xb8,16),center:v(0xa0),extents:v(0xac),extentScale:m.f32(a.address+0xf8),contactClass:m.u32(a.address+0x154)};
 if(m.u32(a.address+0x158)!==a.bike.proxyAddress)throw Error('Rider proxy differs');
 const other=w.actors.get(c.other.ownerAddress);
 respondMcmRiderCrashContact({rider,collision:c,proxy:a.bike.riderTransform,grid:w.grid,gridEnabled:w.enabled,...w.riderResponse,otherVelocity:other.velocity});
 const blocks=observation.blocks.map(b=>({...b,bytes:Buffer.from(b.hex,'hex')}));
 if(output.length!==blocks.reduce((n,b)=>n+b.size,0))throw Error('Wrong rider oracle output length');
 const put=(address,value)=>{const b=blocks.find(b=>address>=b.address&&address+4<=b.address+b.size);if(!b)throw Error('Uncaptured rider store');b.bytes.writeUInt32LE(value>>>0,address-b.address);},vector=(address,v)=>v.forEach((x,i)=>put(address+i*4,floatBits(x)));
 vector(a.address+0x58,rider.velocity);vector(a.address+0x64,rider.angular);vector(a.address+0xb8,rider.matrix);put(a.address+0x154,rider.contactClass);
 vector(c.address+0x64,c.extents);vector(c.address+0x70,c.localCenter);vector(c.address+0x7c,c.worldCenter);vector(c.address+0x1c,c.matrix);put(c.address+0x5c,floatBits(c.radius));put(c.address+0x60,floatBits(c.radiusSquared));
 for(const n of w.transformNodes.values()){vector(n.address+0x84,n.local);vector(n.address+0xc4,n.world);put(n.address+0x104,n.cacheValid);}
 for(const n of w.nodes.values())for(const [i,v] of [n.previous?.token??0,n.next?.token??0,n.owner,n.cell,n.other,n.active].entries())put(n.token+i*4,v);
 let differences=0,changedWords=0,comparedWords=0,cursor=0;const firstDifferences=[];
 for(const b of blocks){const before=Buffer.from(b.hex,'hex');for(let i=0;i<b.size;i+=4){const original=output.readUInt32LE(cursor+i),recovered=b.bytes.readUInt32LE(i);comparedWords++;if(original!==before.readUInt32LE(i))changedWords++;if(original!==recovered){differences++;if(firstDifferences.length<20)firstDifferences.push({field:`0x${(b.address+i).toString(16)}`,original,recovered});}}cursor+=b.size;}
 return {scope:'Original rider primary crash callback 0x40e420, including impulse, proxy, collider and grid updates, using captured rider-bike contact. Complete ordered dispatch and trajectories excluded.',comparedWords,changedWords,differences,firstDifferences};
}
