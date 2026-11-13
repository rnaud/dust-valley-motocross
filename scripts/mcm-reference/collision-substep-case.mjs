import {floatBits} from '../../src/physics/mcm/math.js';
import {updateMcmCollisionSubstep} from '../../src/physics/mcm/collision-substep.js';
import {primaryMcmCollision} from '../../src/physics/mcm/collision-callback.js';
import {applyMcmCollisionEvent} from '../../src/physics/mcm/collision-event.js';
import {createMcmEventGraph} from '../../src/physics/mcm/event-graph.js';
import {collisionEventWords} from './collision-event-case.mjs';
export function evaluateCollisionSubstep(c){
 const bike=structuredClone(c.bike),proxy=structuredClone(c.proxy),other=structuredClone(c.other);
 const cells=Array.from({length:17},(_,i)=>({id:1000+i})),markers=Array.from({length:17},(_,i)=>({id:2000+i}));
 cells.forEach((cell,i)=>{cell.next=markers[i];markers[i].previous=cell;markers[i].owner=1;});
 const entries=c.oldCells.map((cell,i)=>({id:i+1,cell,active:c.active[i],owner:0,other:77+i}));
 for(const e of entries)if(e.active){let tail=cells[e.cell];while(tail.next)tail=tail.next;tail.next=e;e.previous=tail;}
 const collision={...structuredClone(c.collision),type:1,owner:0,entries},grid={centerX:0,centerZ:0,dimension:4,cellSize:10,cells};
 const setup={...c.event.setup,targetLocal:bike.transform.local,targetWorld:bike.transform.world,targetCache:bike.transform.cacheValid};
 const graph=createMcmEventGraph(setup);
 let event={...c.event,...graph,triggered:bike.state844,state:bike.state844,randomCalls:0,inputCalls:0,
  velocity:bike.velocity,angularVelocity:bike.angularVelocity,envelope:setup.envelope,direction:setup.direction,inverted:setup.inverted,field890:setup.field890,resource:setup.resource,
  boundsMin:setup.liveBoundsMin,boundsMax:setup.liveBoundsMax,scratch540:bike.scratch540,scratch54c:setup.scratch54c,rider:setup.rider};
 const wall={enabled:1,type:3,start:other.position,end:other.velocity,contactCC:[0,0,0],contactD8:[0,0,0],contactE4:[0,0,0]};
 collision.other=wall;
 Object.assign(collision,{enabled:c.step.enabled,radiusSquared:Math.fround(collision.radius*collision.radius),extents:Array(3).fill(collision.radius)});
 const manager={enabled:c.step.managerEnabled,objects:[collision,wall],cells,pairs:Array.from({length:2},()=>Array(2).fill(c.step.pair)),depth:0,contactCC:[1000,1001,1002],contactD8:[1003,1004,1005],contactE4:[1006,1007,1008],otherE4:[1009,1010,1011]};
 bike.field8ac=c.event.suppress;bike.carry=c.step.carry;
 collision.onPrimary=()=>primaryMcmCollision({bike,collision,collisionType:2,proxy,grid,gridEnabled:c.gridEnabled,onEvent:contact=>{event=applyMcmCollisionEvent(contact,c.event);}});
 const step={bike,collision:c.step.present?collision:null,proxy,grid,gridEnabled:c.gridEnabled,manager,remaining:c.step.remaining};
 updateMcmCollisionSubstep(step);
 // With no event transition, reflect the live transform after proxy sync.
 event.target={...bike.transform};event.velocity=bike.velocity;event.angularVelocity=bike.angularVelocity;event.scratch540=bike.scratch540;

 const id=n=>n?.id||0;
 const words=[...[...bike.position,...bike.velocity,...bike.angularVelocity,...bike.worldAngularVelocity,...bike.scratch540,...bike.field654,bike.speed].map(floatBits),...[bike.transform,proxy].flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...collision.matrix,...collision.worldCenter].map(floatBits),...entries.flatMap(e=>[id(e.previous),id(e.next),e.owner,e.cell,e.other,e.active]),...cells.flatMap((cell,i)=>[id(cell.next),id(markers[i].previous),id(markers[i].next)]),...[other.transform,other.riderTransform].flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...other.velocity,...other.angularVelocity,...other.rider.velocity,...other.rider.angular,...other.rider.alternateVelocity,...other.rider.alternateAngular].map(floatBits)];
 const tail=[step.remaining,floatBits(bike.carry),bike.field8a8,+(collision.other===wall),...manager.pairs.flat(),...[manager.depth,...manager.contactCC,...manager.contactD8,...manager.contactE4,...manager.otherE4,...collision.contactCC,...collision.contactD8,...collision.contactE4,...wall.contactCC,...wall.contactD8,...wall.contactE4].map(floatBits),+(wall.other===collision),+(manager.currentA===0),+(manager.currentB===1)];
 return [...words,...tail,...collisionEventWords(event)];
}
