import {loadLiveCollisionWorld} from './live-collision-world.mjs';
export function loadLiveCollisionDispatch(checkpoint,observation){
 if(!observation.actorsCaptured)throw Error('Collision actor capture required');
 const world=loadLiveCollisionWorld(checkpoint,observation),m=world.memory,a=world.manager;
 m.read(a,0x3988);m.read(0x4e3754,8);
 const vector=o=>[0,4,8].map(i=>m.f32(a+o+i));
 const objectFor=address=>{if(!address)return null;const o=world.objects.find(o=>o.address===address);if(!o)throw Error('Uncaptured collision contact object');return o;};
 for(const o of world.objects)o.other=objectFor(o.otherAddress);
 const manager={objects:world.objects,cells:world.grid.cells,pairs:Array.from({length:60},(_,i)=>Array.from({length:60},(_,j)=>m.u32(a+0xf8+(i*60+j)*4))),enabled:m.u32(0x4e3758),depth:m.f32(a+0x394c),contactCC:vector(0x3950),contactD8:vector(0x395c),contactE4:vector(0x3968),otherE4:vector(0x3974),currentA:objectFor(m.u32(a+0x3980))?.owner,currentB:objectFor(m.u32(a+0x3984))?.owner};
 return {...world,dispatch:manager};
}
