import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
import {mcmFtolLowWord} from './x87-integer.js';
import {insertMcmCollisionLine} from './collision-line-grid.js';
const f=Math.fround;
// Original 0x42a550 followed by 0x42a6e0, types 0/1.
// Cells are linked-list sentinels. Entry metadata survives unlinking.
export function updateMcmCollisionGrid(object,grid,enabled){
 if(object.type===0||object.type===1){
  const m=object.matrix,[x,y,z]=object.localCenter;
  object.worldCenter=new Float64Array(3);
  object.worldCenter[0]=f(add(add(add(mul(m[4],y),mul(m[0],x)),mul(m[8],z)),m[12]));
  object.worldCenter[1]=f(add(add(add(mul(m[9],z),mul(m[5],y)),mul(m[1],x)),m[13]));
  object.worldCenter[2]=f(add(add(add(mul(m[2],x),mul(m[10],z)),mul(m[6],y)),m[14]));
 }
 if(!enabled)return;
 for(const entry of object.entries||[]){
  if(!entry.active)continue;
  if(entry.previous)entry.previous.next=entry.next;
  if(entry.next)entry.next.previous=entry.previous;
  entry.previous=null;entry.next=null;entry.active=0;
 }
 if(object.type===3||object.type===4){insertMcmCollisionLine(object,grid);return;}
 if(object.type!==0&&object.type!==1){
  return;
 }
 // The original initializes links, owner, auxiliary and active fields, but
 // leaves unused cell indices uninitialized until their first insertion.
 if(!object.entries)object.entries=Array.from({length:4},()=>({previous:null,next:null,owner:object.owner,other:0,active:0}));
 const n=grid.dimension,size=grid.cellSize;
 const originX=f(grid.centerX-(n*.5)*size),originZ=f(grid.centerZ-(n*.5)*size);
 const radius=object.radius,seen=[];
 for(let i=0;i<4;i++){
  const x=f(mcmFtolLowWord((((i&1)?radius:-radius)-originX+object.worldCenter[0])/size));
  const z=f(mcmFtolLowWord((((i&2)?radius:-radius)-originZ+object.worldCenter[2])/size));
  const cell=x<0||z<0||!(n>x)||!(n>z)?Math.imul(n,n):mcmFtolLowWord(n*z+x);
  if(!seen.includes(cell)){
   const entry=object.entries[i];entry.active=1;entry.cell=cell;
   let tail=grid.cells[cell];while(tail.next)tail=tail.next;
   tail.next=entry;entry.previous=tail;
  }
  seen.push(cell);
 }
}
