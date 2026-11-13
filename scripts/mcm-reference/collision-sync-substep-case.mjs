import {evaluatePostStateSubstep} from './post-state-substep-case.mjs';
import {updateMcmCollisionSyncSubstep} from '../../src/physics/mcm/collision-sync-substep.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateCollisionSyncSubstep(input){
 let tail;
 const prefix=evaluatePostStateSubstep(input,c=>{
  const s=c.collisionSync,p=s.proxy;c.riderNode=p;
  p.parent=p.parentIndex<0?null:c.nodes[p.parentIndex];
  if(p.parent){p.nextSibling=p.parent.firstChild;p.parent.firstChild=p;}
  const cells=Array.from({length:17},(_,i)=>({id:1000+i})),markers=Array.from({length:17},(_,i)=>({id:2000+i,owner:1}));
  cells.forEach((cell,i)=>{cell.next=markers[i];markers[i].previous=cell;});
  const entries=s.oldCells.map((cell,i)=>({id:i+1,cell,active:s.active[i],owner:0,other:77+i}));
  for(const e of entries)if(e.active){let t=cells[e.cell];while(t.next)t=t.next;t.next=e;e.previous=t;}
  s.object={type:s.type,radius:s.radius,localCenter:s.localCenter,worldCenter:s.worldCenter,matrix:s.matrix,entries,owner:0,other:1};
  s.grid={centerX:0,centerZ:0,dimension:4,cellSize:10,cells};
  const r=updateMcmCollisionSyncSubstep(c),id=n=>n?.id||0;
  tail=[...Array.from(p.local,floatBits),...Array.from(p.world,floatBits),p.cacheValid,...Array.from(s.object.matrix,floatBits),...Array.from(s.object.worldCenter,floatBits),...entries.flatMap(e=>[id(e.previous),id(e.next),e.owner,e.cell>>>0,e.other,e.active]),...cells.flatMap((cell,i)=>[id(cell.next),id(markers[i].previous),id(markers[i].next)]),+(s.object.other===1)];
  return r;
 });
 return [...prefix,...tail];
}
