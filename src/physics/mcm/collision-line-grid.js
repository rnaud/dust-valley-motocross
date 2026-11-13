import {floatBits} from './math.js';
const f=Math.fround;
// Original type 3/4 branches 0x42a9a0..0x42b673, after common entry unlinking.
export function insertMcmCollisionLine(object,grid){
 const n=grid.dimension,size=grid.cellSize;
 const ox=f(grid.centerX-(n*.5)*size),oz=f(grid.centerZ-(n*.5)*size);
 const [ax,az]=object.start,[bx,bz]=object.end;
 const insert=(rawX,rawZ)=>{
  const x=f(Math.trunc(rawX/size)|0),z=f(Math.trunc(rawZ/size)|0);
  const cell=x<0||z<0||!(n>x)||!(n>z)?Math.imul(n,n):(Math.trunc(n*z+x)|0);
  const head=grid.cells[cell];let current=head,found=false;
  // Original checks the sentinel and each node with a successor, excluding
  // the tail. Preserve this unusual duplicate test, including empty lists.
  while(current.next){if(current.owner===object.owner)found=true;current=current.next;}
  if(found)return;
  const entry={owner:object.owner,other:0,active:1,previous:head,next:head.next||null};
  if(entry.next)entry.next.previous=entry;
  head.next=entry;
 };
 insert(ax-ox,az-oz);insert(bx-ox,bz-oz);
 const dx=f(bx-ax),dz=f(bz-az);
 if(Math.abs(dx)>0){
  const count=Math.trunc(Math.abs(dx/size))|0;
  for(let i=0;i<=count;i++){
   const x=f((floatBits(dx)|0)>0?(i*size-ox)+ax:(ax-i*size)-ox);
   const z=(((x-(ax-ox))/dx)*dz-oz)+az;
   insert(x,z);
  }
 }
 if(Math.abs(dz)>0){
  const count=Math.trunc(Math.abs(dz/size))|0;
  for(let i=0;i<=count;i++){
   // Original uses the X origin here, even for the Z traversal.
   const z=f((floatBits(dz)|0)>0?(i*size-ox)+az:(az-i*size)-ox);
   const x=(((z-(az-oz))/dz)*dx-ox)+ax;
   insert(x,z);
  }
 }
}
