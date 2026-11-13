const f=Math.fround;
// Original 0x42a550 followed by 0x42a6e0, existing entry storage, types 0/1.
// Cells are linked-list sentinels. Entry metadata survives unlinking.
export function updateMcmCollisionGrid(object,grid,enabled){
 if(object.type===0||object.type===1){
  const m=object.matrix,[x,y,z]=object.localCenter;
  object.worldCenter=[f(((m[4]*y+m[0]*x)+m[8]*z)+m[12]),f(((m[9]*z+m[5]*y)+m[1]*x)+m[13]),f(((m[2]*x+m[10]*z)+m[6]*y)+m[14])];
 }
 if(!enabled)return;
 for(const entry of object.entries){
  if(!entry.active)continue;
  if(entry.previous)entry.previous.next=entry.next;
  if(entry.next)entry.next.previous=entry.previous;
  entry.previous=null;entry.next=null;entry.active=0;
 }
 if(object.type!==0&&object.type!==1){
  if(object.type===3||object.type===4)throw new RangeError('Collision grid types 3/4 not recovered');
  return;
 }
 const n=grid.dimension,size=grid.cellSize;
 const originX=f(grid.centerX-(n*.5)*size),originZ=f(grid.centerZ-(n*.5)*size);
 const radius=object.radius,seen=[];
 for(let i=0;i<4;i++){
  const x=f(Math.trunc((((i&1)?radius:-radius)-originX+object.worldCenter[0])/size)|0);
  const z=f(Math.trunc((((i&2)?radius:-radius)-originZ+object.worldCenter[2])/size)|0);
  const cell=x<0||z<0||!(n>x)||!(n>z)?Math.imul(n,n):Math.trunc(n*z+x)|0;
  if(!seen.includes(cell)){
   const entry=object.entries[i];entry.active=1;entry.cell=cell;
   let tail=grid.cells[cell];while(tail.next)tail=tail.next;
   tail.next=entry;entry.previous=tail;
  }
  seen.push(cell);
 }
}
