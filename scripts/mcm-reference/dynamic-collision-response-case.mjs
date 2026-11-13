import {floatBits} from '../../src/physics/mcm/math.js';
import {respondMcmDynamicCollision} from '../../src/physics/mcm/dynamic-collision-response.js';
export function evaluateDynamicCollision(c){
 const bike=structuredClone(c.bike),proxy=structuredClone(c.proxy),other=structuredClone(c.other);
 const cells=Array.from({length:17},(_,i)=>({id:1000+i})),markers=Array.from({length:17},(_,i)=>({id:2000+i}));
 cells.forEach((cell,i)=>{cell.next=markers[i];markers[i].previous=cell;});
 const entries=c.oldCells.map((cell,i)=>({id:i+1,cell,active:c.active[i],owner:123,other:77+i}));
 for(const e of entries)if(e.active){let tail=cells[e.cell];while(tail.next)tail=tail.next;tail.next=e;e.previous=tail;}
 const collision={...structuredClone(c.collision),type:1,owner:123,entries},grid={centerX:0,centerZ:0,dimension:4,cellSize:10,cells};
 respondMcmDynamicCollision({bike,other,collisionType:c.collisionType,collision,proxy,grid,gridEnabled:c.gridEnabled});
 const id=n=>n?.id||0;
 return [...[...bike.position,...bike.velocity,...bike.angularVelocity,...bike.worldAngularVelocity,...bike.scratch540,...bike.field654,bike.speed].map(floatBits),...[bike.transform,proxy].flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...collision.matrix,...collision.worldCenter].map(floatBits),...entries.flatMap(e=>[id(e.previous),id(e.next),e.owner,e.cell,e.other,e.active]),...cells.flatMap((cell,i)=>[id(cell.next),id(markers[i].previous),id(markers[i].next)]),...[other.transform,other.riderTransform].flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...other.velocity,...other.angularVelocity,...other.rider.velocity,...other.rider.angular,...other.rider.alternateVelocity,...other.rider.alternateAngular].map(floatBits)];
}
