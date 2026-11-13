import {resolveMcmWorldMatrix} from '../../src/physics/mcm/world-transform.js';
import {updateMcmCollisionGrid} from '../../src/physics/mcm/collision-grid.js';
import {floatBits} from '../../src/physics/mcm/math.js';
import {updateMcmSubstepTail} from '../../src/physics/mcm/substep-tail.js';
import {bindMcmBikeCollisionCallbacks} from '../../src/physics/mcm/collision-callback.js';
import {applyMcmCollisionEvent} from '../../src/physics/mcm/collision-event.js';
import {createMcmEventGraph} from '../../src/physics/mcm/event-graph.js';
import {collisionEventWords} from './collision-event-case.mjs';
export function evaluateSubstepTail(input){
 const c=structuredClone(input);
 const bike=structuredClone(c.bike),proxy=structuredClone(c.proxy),other=structuredClone(c.other);
 const cells=Array.from({length:17},(_,i)=>({id:1000+i})),markers=Array.from({length:17},(_,i)=>({id:2000+i}));
 cells.forEach((cell,i)=>{cell.next=markers[i];markers[i].previous=cell;markers[i].owner=2;});
 const entries=c.oldCells.map((cell,i)=>({id:i+1,cell,active:c.active[i],owner:0,other:77+i}));
 for(const e of entries)if(e.active){let tail=cells[e.cell];while(tail.next)tail=tail.next;tail.next=e;e.previous=tail;}
 const collision={...structuredClone(c.collision),type:1,owner:0,entries},grid={centerX:0,centerZ:0,dimension:4,cellSize:10,cells};
 const setup={...c.event.setup,targetLocal:bike.transform.local,targetWorld:bike.transform.world,targetCache:bike.transform.cacheValid};
 const graph=createMcmEventGraph(setup);
 let eventCalled=false;
 let event={...c.event,...graph,triggered:bike.state844,state:bike.state844,randomCalls:0,inputCalls:0,
  velocity:bike.velocity,angularVelocity:bike.angularVelocity,envelope:setup.envelope,direction:setup.direction,inverted:setup.inverted,field890:setup.field890,resource:setup.resource,
  boundsMin:setup.liveBoundsMin,boundsMax:setup.liveBoundsMax,scratch540:bike.scratch540,scratch54c:setup.scratch54c,rider:setup.rider};
 const secondEntries=Array.from({length:4},(_,i)=>({id:i+101,cell:0,active:0,owner:1,other:0}));
 const wall={owner:1,enabled:1,type:1,collisionClass:0,bike:other,localCenter:[0,0,0],worldCenter:[0,0,0],matrix:[...resolveMcmWorldMatrix(other.transform)],radius:collision.radius,radiusSquared:Math.fround(collision.radius*collision.radius),extents:Array(3).fill(collision.radius),entries:secondEntries,contactCC:[0,0,0],contactD8:[0,0,0],contactE4:[0,0,0]};
 updateMcmCollisionGrid(wall,grid,c.gridEnabled);
 Object.assign(other,{field618:0,field564:0,field8d0:0,field8ac:0,field8a8:0,heading:bike.heading,restitution:bike.restitution,speed:bike.speed,scratch540:[0,0,0],field654:[0,0,0]});
 bike.alternateMass=Math.fround(bike.inverseMass*2);collision.collisionClass=0;

 collision.other=wall;
 Object.assign(collision,{enabled:c.step.enabled,radiusSquared:Math.fround(collision.radius*collision.radius),extents:Array(3).fill(collision.radius)});
 const manager={enabled:c.step.managerEnabled,objects:[collision,wall,{enabled:0}],cells,pairs:Array.from({length:3},()=>Array(3).fill(c.step.pair)),depth:0,contactCC:[1000,1001,1002],contactD8:[1003,1004,1005],contactE4:[1006,1007,1008],otherE4:[1009,1010,1011]};
 bike.field8ac=c.event.suppress;bike.carry=c.step.carry;
 bindMcmBikeCollisionCallbacks({bike,collision,proxy,grid,gridEnabled:c.gridEnabled,onEvent:contact=>{eventCalled=true;event=applyMcmCollisionEvent(contact,c.event);}});
 const zero=[0,0,0],secondEvent={...c.event,launch:0,inputPresent:0,field710:0,field714:0,field4bc:0,suppress:0,eventKind:0,reason:0,otherPresent:0,counter:0,field820:0,angle4f0:0,angle4d8:0,up:[0,1,0],uprightThreshold:0,time:1,animation:0,
  setup:{...c.event.setup,parented:0,sourceLocal:other.transform.local,sourceWorld:other.transform.world,sourceCache:other.transform.cacheValid,envelope:[0,0,0,0],direction:zero,inverted:0,field890:0,resource:0,liveBoundsMin:zero,liveBoundsMax:zero,scratch54c:zero}};
 bindMcmBikeCollisionCallbacks({bike:other,collision:wall,proxy:other.riderTransform,grid,gridEnabled:c.gridEnabled,onEvent:contact=>applyMcmCollisionEvent(contact,secondEvent)});
 const step={bike,collision:c.step.present?collision:null,proxy,grid,gridEnabled:c.gridEnabled,manager,remaining:c.step.remaining,dt:c.step.dt,inverseDt:c.step.inverseDt,post:c.post,event:c.event};
 const {post,finish}=updateMcmSubstepTail(step);
 if(!eventCalled)event.field714=post.field714;
 // With no event transition, reflect the live transform after proxy sync.
 event.target={...bike.transform};event.velocity=bike.velocity;event.angularVelocity=bike.angularVelocity;event.scratch540=bike.scratch540;

 const id=n=>n?.id||0;
 const words=[...[...bike.position,...bike.velocity,...bike.angularVelocity,...bike.worldAngularVelocity,...bike.scratch540,...bike.field654,bike.speed].map(floatBits),...[bike.transform,proxy].flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...collision.matrix,...collision.worldCenter].map(floatBits),...entries.flatMap(e=>[id(e.previous),id(e.next),e.owner,e.cell,e.other,e.active]),...cells.flatMap((cell,i)=>[id(cell.next),id(markers[i].previous),id(markers[i].next)]),...[other.transform,other.riderTransform].flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...other.velocity,...other.angularVelocity,...other.rider.velocity,...other.rider.angular,...other.rider.alternateVelocity,...other.rider.alternateAngular].map(floatBits)];
 const tail=[step.remaining,floatBits(bike.carry),bike.field8a8,+(collision.other===wall),...manager.pairs.slice(0,2).flatMap(row=>row.slice(0,2)),...[manager.depth,...manager.contactCC,...manager.contactD8,...manager.contactE4,...manager.otherE4,...collision.contactCC,...collision.contactD8,...collision.contactE4,...wall.contactCC,...wall.contactD8,...wall.contactE4].map(floatBits),+(wall.other===collision),+(manager.currentA===0),+(manager.currentB===1)];
 const second=[...[...other.position,...other.velocity,...other.angularVelocity,...other.worldAngularVelocity,...other.scratch540,...other.field654,other.speed].map(floatBits),other.field8a8,...[...wall.matrix,...wall.worldCenter].map(floatBits),...secondEntries.flatMap(e=>[id(e.previous),id(e.next),e.owner,e.cell,e.other,e.active]),other.state844];
 const end=[finish.remaining,...[finish.carry,finish.dt,finish.inverseDt,...finish.forward,...finish.up,finish.yaw,finish.pitch,finish.roll,finish.sinRoll,finish.cosRoll,finish.cosPitch].map(floatBits),event.field714,post.field870,...[post.timer,post.score,post.frontHeight,post.rearHeight,post.lastDt].map(floatBits)];
 return [...words,...tail,...second,...end,...collisionEventWords(event)];
}
