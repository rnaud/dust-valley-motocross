import {Body,Heightfield} from 'cannon-es';
import {DEFAULT_SOIL} from './sand-physics.js';
import {FINE_CELL,OP} from './sand-fine-gpu.js';

// The physics view of GPU sand. Same interface as SandSurface (sand-physics.js),
// but the sand itself lives in FineSandGPU:
//  - a local copy of the nodes around the bike is read back from the GPU every
//    frame; between readbacks the CPU predicts its own deformation with the
//    exact op formulas the GPU uses, and replays not-yet-included ops after
//    each readback, so wheels always ride the ruts they just made;
//  - every deformation becomes a primitive op (dig disc, side berm, deposit
//    disc) applied locally and queued for the GPU;
//  - collision is one 16 m cannon Heightfield that follows the bike.
// Heights = coarseHeight(x, z) (the GPU avalanche field, sampled on the CPU)
// + the fine detail d.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SPAN=96,TILE=64;
export class GpuSandSurface{
 constructor(fine,coarseHeight,{soil={},flipRows=false}={}){
  this.isGpuSand=true;this.fine=fine;this.coarseHeight=coarseHeight;this.profile={...DEFAULT_SOIL,...soil};this.flipRows=flipRows;
  this.d=new Float32Array(SPAN*SPAN);this.g=new Float32Array(SPAN*SPAN);this.b=new Float32Array(SPAN*SPAN);this.i0=0;this.j0=0;this.placed=false;
  this.previous=[null,null];this.events=[];this.dirty=new Set();this.onCells=null;this.tiles=new Map();this.version=0;
  this.history=[];this.tile=null;this.reading=false;this.bounds=null;this.changed=new Set();
 }
 local(ix,iz){const i=ix-this.i0,j=iz-this.j0;return i<0||j<0||i>=SPAN||j>=SPAN?-1:j*SPAN+i;}
 deltaAt(ix,iz){const k=this.local(ix,iz);return k<0?0:this.d[k];}
 node(ix,iz){return this.coarseHeight(ix*FINE_CELL,iz*FINE_CELL)+this.deltaAt(ix,iz);}
 sample(x,z,node){
  const gx=x/FINE_CELL,gz=-z/FINE_CELL,ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz;
  const a=node(ix,-iz),b=node(ix+1,-iz),c=node(ix,-iz-1),d=node(ix+1,-iz-1);
  return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
 }
 height(x,z){return this.sample(x,z,(ix,iz)=>this.node(ix,iz));}
 displacementAt(x,z){return this.sample(x,z,(ix,iz)=>this.deltaAt(ix,iz));}
 compaction(x,z){const k=this.local(Math.round(x/FINE_CELL),Math.round(z/FINE_CELL));return k<0?0:this.g[k];}
 // ---------------------------------------------------------------- ops ---
 // One implementation per op kind: used for prediction and for replay.
 applyOp(op){
  const {kind,x,z,radius:R,p}=op,soil=this.profile;let removed=0;
  const reach=kind===OP.RING?R:R;
  for(let ix=Math.floor((x-reach)/FINE_CELL);ix<=Math.ceil((x+reach)/FINE_CELL);ix++)for(let iz=Math.floor((z-reach)/FINE_CELL);iz<=Math.ceil((z+reach)/FINE_CELL);iz++){
   const k=this.local(ix,iz);if(k<0)continue;const ox=ix*FINE_CELL-x,oz=iz*FINE_CELL-z,dist=Math.hypot(ox,oz);
   if(kind===OP.DIG){
    const r=dist/R;if(r>=1)continue;const w=(1-r*r)**2,amount=Math.max(0,p[0]*w-Math.max(0,-this.d[k]))*p[1];if(amount<=0)continue;
    const next=Math.max(-soil.maxDepth,this.d[k]-amount);removed+=this.d[k]-next;this.d[k]=next;this.g[k]=clamp(this.g[k]+amount*p[2],0,1);this.b[k]=1;this.changed.add(k);
   }else if(kind===OP.RING){
    if(dist<p[0]||dist>R)continue;const hasDir=Math.hypot(p[2],p[3])>.5,w=hasDir?2.4*((ox*p[3]-oz*p[2])/Math.max(dist,1e-4))**2:1;if(w<.05)continue;
    this.d[k]=Math.min(soil.maxLift,this.d[k]+p[1]*w);this.b[k]=1;this.changed.add(k);
   }else{
    const r=dist/R;if(r>=1)continue;this.d[k]=Math.min(soil.maxLift,this.d[k]+p[0]*(1-r*r)**2);this.g[k]*=.5;this.b[k]=1;this.changed.add(k);
   }
  }
  return removed;
 }
 emit(kind,x,z,radius,p){const op={kind,x,z,radius,p,step:this.fine.step};const removed=this.applyOp(op);this.history.push(op);this.fine.push(kind,x,z,radius,p);return removed;}
 // Weight sums over the 0.25 m lattice, so deposits conserve exactly.
 ringWeights(x,z,rin,rout,dir){
  let sum=0;for(let ix=Math.floor((x-rout)/FINE_CELL);ix<=Math.ceil((x+rout)/FINE_CELL);ix++)for(let iz=Math.floor((z-rout)/FINE_CELL);iz<=Math.ceil((z+rout)/FINE_CELL);iz++){
   const ox=ix*FINE_CELL-x,oz=iz*FINE_CELL-z,dist=Math.hypot(ox,oz);if(dist<rin||dist>rout)continue;const w=dir?2.4*((ox*dir.z-oz*dir.x)/Math.max(dist,1e-4))**2:1;if(w>=.05)sum+=w;}
  return sum;
 }
 discWeights(x,z,R){let sum=0;for(let ix=Math.floor((x-R)/FINE_CELL);ix<=Math.ceil((x+R)/FINE_CELL);ix++)for(let iz=Math.floor((z-R)/FINE_CELL);iz<=Math.ceil((z+R)/FINE_CELL);iz++){const r=Math.hypot(ix*FINE_CELL-x,iz*FINE_CELL-z)/R;if(r<1)sum+=(1-r*r)**2;}return sum;}
 depositDisc(x,z,depthSum,R){const sum=this.discWeights(x,z,R);if(sum>0&&depthSum>0)this.emit(OP.DISC,x,z,R,[depthSum/sum,0,0,0]);}
 // ---------------------------------------------- SandSurface interface ---
 stamp(x,z,load,demand,dt,dir=null,sinkage){
  const soil=this.profile,pressure=clamp(load/1000,0,2);if(pressure<=0)return 0;
  const target=sinkage>0?Math.min(sinkage,soil.maxDepth):soil.settle+soil.dig*clamp(demand,0,1),rate=1-Math.exp(-dt*pressure*35);
  const removed=this.emit(OP.DIG,x,z,.4,[target,rate,5,0]);
  if(removed>0){
   const side=soil.sideLip&&dir?dir:null,weights=this.ringWeights(x,z,.42,.7,side);
   const share=soil.conserve?removed*(1-clamp(demand,0,1)*soil.roost)/weights:removed*soil.lip;
   if(weights>0)this.emit(OP.RING,x,z,.7,[.42,share,side?side.x:0,side?side.z:0]);
  }
  return removed;
 }
 throwRoost(x,z,dx,dz,amount){const length=Math.hypot(dx,dz);if(!(amount>0)||length<1e-6)return;this.depositDisc(x-dx/length*1.15,z-dz/length*1.15,amount*this.profile.roost,.5);}
 deposit(x,z,volume,radius=.35){if(volume>0)this.depositDisc(x,z,volume/(FINE_CELL*FINE_CELL),radius);}
 gouge(x,z,vx,vz,dt){
  const soil=this.profile,speed=Math.hypot(vx,vz);if(!(soil.gouge>0)||speed<.8)return 0;
  const target=Math.min(soil.maxDepth,soil.gouge*(.05+.025*Math.min(speed,8)));
  const removed=this.emit(OP.DIG,x,z,.45,[target,1-Math.exp(-dt*speed*6),-.7,0])*FINE_CELL*FINE_CELL;
  if(removed>0){this.depositDisc(x+vx/speed*.75,z+vz/speed*.75,removed*.55/(FINE_CELL*FINE_CELL),.55);this.events.push({x,z,vx,vz,amount:removed*.45});if(this.events.length>64)this.events.shift();}
  return removed;
 }
 deform(contacts,dt){
  for(let i=0;i<2;i++){
   const hit=contacts[i],prev=this.previous[i];
   if(!hit||hit.load<=0){this.previous[i]=null;continue;}
   const distance=prev?Math.hypot(hit.x-prev.x,hit.z-prev.z):0,steps=distance<=4?Math.max(1,Math.ceil(distance/.125)):1;
   const dir=prev&&distance>1e-3&&distance<=4?{x:(hit.x-prev.x)/distance,z:(hit.z-prev.z)/distance}:null;let removed=0;
   for(let n=1;n<=steps;n++){const t=n/steps,x=steps>1?prev.x+(hit.x-prev.x)*t:hit.x,z=steps>1?prev.z+(hit.z-prev.z)*t:hit.z;removed+=this.stamp(x,z,hit.load,hit.demand??0,dt/steps,dir,hit.sinkage);}
   if(this.profile.roost>0&&dir&&(hit.demand??0)>0)this.throwRoost(hit.x,hit.z,dir.x,dir.z,removed*(hit.demand??0));
   this.previous[i]={x:hit.x,z:hit.z};
  }
  this.refreshTile();
 }
 resetContacts(){this.previous=[null,null];}
 // ------------------------------------------------- windows and tiles ---
 recentre(x,z){
  const i0=Math.round(x/FINE_CELL)-SPAN/2,j0=Math.round(z/FINE_CELL)-SPAN/2;
  if(this.placed&&Math.abs(i0-this.i0)<16&&Math.abs(j0-this.j0)<16)return;
  const d=new Float32Array(SPAN*SPAN),g=new Float32Array(SPAN*SPAN),b=new Float32Array(SPAN*SPAN);
  if(this.placed)for(let j=0;j<SPAN;j++)for(let i=0;i<SPAN;i++){const k=this.local(i0+i,j0+j);if(k>=0){d[j*SPAN+i]=this.d[k];g[j*SPAN+i]=this.g[k];b[j*SPAN+i]=this.b[k];}}
  this.d=d;this.g=g;this.b=b;this.i0=i0;this.j0=j0;this.placed=true;this.fine.center(x,z);
 }
 follow(x,z,world){
  this.recentre(x,z);this.world=world;
  const ti=Math.round(x/FINE_CELL)-TILE/2,tj=Math.round(z/FINE_CELL)-TILE/2;
  if(this.tile&&Math.abs(ti-this.tile.ti)<16&&Math.abs(tj-this.tile.tj)<16)return;
  if(this.tile)world.removeBody(this.tile.body);
  const data=Array.from({length:TILE+1},(_,i)=>Array.from({length:TILE+1},(_,j)=>this.node(ti+i,tj+TILE-j)));
  const shape=new Heightfield(data,{elementSize:FINE_CELL}),body=new Body({mass:0});body.sandSurface=this;body.addShape(shape);
  body.quaternion.setFromEuler(-Math.PI/2,0,0);body.position.set(ti*FINE_CELL,0,(tj+TILE)*FINE_CELL);world.addBody(body);
  this.tile={ti,tj,data,shape,body,key:'gpu'};this.tiles=new Map([['gpu',this.tile]]);
  this.bounds={minX:ti*FINE_CELL,maxX:(ti+TILE)*FINE_CELL,minZ:tj*FINE_CELL,maxZ:(tj+TILE)*FINE_CELL};this.version++;
 }
 refreshTile(full=false){
  const t=this.tile;if(!t)return;
  if(full||this.dirty.size){for(let i=0;i<=TILE;i++)for(let j=0;j<=TILE;j++)t.data[i][j]=this.node(t.ti+i,t.tj+TILE-j);t.shape.update();this.dirty.clear();}
  else{if(!this.changed.size)return;for(const k of this.changed){const ix=this.i0+k%SPAN,iz=this.j0+Math.floor(k/SPAN),i=ix-t.ti,j=t.tj+TILE-iz;if(i>=0&&i<=TILE&&j>=0&&j<=TILE)t.shape.setHeightValueAtIndex(i,j,this.node(ix,iz));}}
  this.changed.clear();t.shape.updateMinValue();t.shape.updateMaxValue();t.shape.updateBoundingSphereRadius();t.body.updateBoundingRadius();t.body.aabbNeedsUpdate=true;this.version++;
 }
 // GPU truth for the local window; replay ops the readback did not include yet.
 applyReadback({data,i0,j0,w,h,step}){
  // Only nodes whose value moved update collision and the track record.
  const record=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const k=this.local(i0+x,j0+y);if(k<0)continue;const p=(y*w+x)*4,d=data[p];
   if(Math.abs(d-this.d[k])>5e-4){this.changed.add(k);if(data[p+2]>.5)record.push([i0+x,j0+y]);}
   this.d[k]=d;this.g[k]=data[p+1];this.b[k]=data[p+2];
  }
  let keep=0;for(const op of this.history)if(op.step>=step){this.history[keep++]=op;this.applyOp(op);}this.history.length=keep;
  this.refreshTile();
  if(this.onCells&&record.length)this.onCells(record,this);
 }
 // Request the next readback of the local window (one in flight at a time).
 sync(){
  if(this.reading||!this.placed||!this.fine.enabled)return;this.reading=true;
  this.fine.read(this.i0,this.j0,SPAN,SPAN,this.flipRows).then(r=>this.applyReadback(r)).catch(()=>{}).finally(()=>{this.reading=false;});
 }
}
