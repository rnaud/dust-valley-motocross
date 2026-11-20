import {DEFAULT_SOIL} from './sand-physics.js';
import {FINE_CELL,OP} from './sand-fine-gpu.js';

// The physics view of GPU sand. Same interface as SandSurface (sand-physics.js),
// but the sand itself lives in FineSandGPU:
//  - a local copy of the nodes around the bike is read back from the GPU every
//    frame; between readbacks the CPU predicts its own deformation with the
//    exact op formulas the GPU uses, and replays not-yet-included ops after
//    each readback, so wheels always ride the ruts they just made;
//  - every deformation becomes a primitive op (dig/sweep, side berm, deposit
//    disc) applied locally and queued for the GPU;
//  - the recovered MCM terrain samples displacementAt() directly, so there is
//    no second rigid-body heightfield.
// Heights = coarseHeight(x, z) (the GPU avalanche field, sampled on the CPU)
// + the fine detail d.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SPAN=96;
export class GpuSandSurface{
 constructor(fine,coarseHeight,{soil={},flipRows=false,residual=null}={}){
  this.residualFn=residual;
  this.isGpuSand=true;this.fine=fine;this.coarseHeight=coarseHeight;this.profile={...DEFAULT_SOIL,...soil};this.flipRows=flipRows;
  this.d=new Float32Array(SPAN*SPAN);this.g=new Float32Array(SPAN*SPAN);this.b=new Float32Array(SPAN*SPAN);this.i0=0;this.j0=0;this.placed=false;
  this.previous=[null,null];this.events=[];this.onCells=null;this.version=0;
  this.history=[];this.reading=false;
 }
 local(ix,iz){const i=ix-this.i0,j=iz-this.j0;return i<0||j<0||i>=SPAN||j>=SPAN?-1:j*SPAN+i;}
 deltaAt(ix,iz){const k=this.local(ix,iz);return k<0?0:this.d[k];}
 // Surface = coarse field + exact-terrain residual + fine detail (as on the GPU).
 node(ix,iz){const x=ix*FINE_CELL,z=iz*FINE_CELL;return this.coarseHeight(x,z)+(this.residualFn?this.residualFn(x,z):0)+this.deltaAt(ix,iz);}
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
  for(let ix=Math.floor((x-R)/FINE_CELL);ix<=Math.ceil((x+R)/FINE_CELL);ix++)for(let iz=Math.floor((z-R)/FINE_CELL);iz<=Math.ceil((z+R)/FINE_CELL);iz++){
   const k=this.local(ix,iz);if(k<0)continue;const ox=ix*FINE_CELL-x,oz=iz*FINE_CELL-z,dist=Math.hypot(ox,oz);
   if(kind===OP.DIG){
    const r=dist/R;if(r>=1)continue;const w=(1-r*r)**2,amount=Math.max(0,p[0]*w-Math.max(0,-this.d[k]))*p[1];if(amount<=0)continue;
    const next=Math.max(-soil.maxDepth,this.d[k]-amount);removed+=this.d[k]-next;this.d[k]=next;this.g[k]=clamp(this.g[k]+amount*p[2],0,1);this.b[k]=1;
   }else if(kind===OP.RING){
    if(dist<p[0]||dist>R)continue;const hasDir=Math.hypot(p[2],p[3])>.5,w=hasDir?2.4*((ox*p[3]-oz*p[2])/Math.max(dist,1e-4))**2:1;if(w<.05)continue;
    this.d[k]=Math.min(soil.maxLift,this.d[k]+p[1]*w);this.b[k]=1;
   }else if(kind===OP.SWEEP){
    // p: to-x, to-z, target depth, compaction. The tool is the capsule from
    // (x,z) to (p[0],p[1]); a wheel at speed carves a continuous trench.
    const ax=x,az=z,bx=p[0],bz=p[1],abx=bx-ax,abz=bz-az,length2=Math.max(abx*abx+abz*abz,1e-8);
    const t=clamp(((ix*FINE_CELL-ax)*abx+(iz*FINE_CELL-az)*abz)/length2,0,1);
    const dx=ix*FINE_CELL-ax-abx*t,dz=iz*FINE_CELL-az-abz*t,r=Math.hypot(dx,dz)/R;
    if(r>=1)continue;const w=(1-r*r)**2,amount=Math.max(0,p[2]*w-Math.max(0,-this.d[k]));
    if(amount<=0)continue;
    const next=Math.max(-soil.maxDepth,this.d[k]-amount);removed+=this.d[k]-next;this.d[k]=next;this.g[k]=clamp(this.g[k]+amount*p[3],0,1);this.b[k]=1;
   }else if(kind===OP.RINGSWEEP){
    // p: to-x, to-z, share depth, inner radius. A tube along the path, only in
    // the side band; mirrors the GPU RINGSWEEP op.
    const ax=x,az=z,bx=p[0],bz=p[1],abx=bx-ax,abz=bz-az,length2=Math.max(abx*abx+abz*abz,1e-8);
    const tRaw=((ix*FINE_CELL-ax)*abx+(iz*FINE_CELL-az)*abz)/length2;if(tRaw<0||tRaw>1)continue;
    const t=tRaw,dx=ix*FINE_CELL-ax-abx*t,dz=iz*FINE_CELL-az-abz*t,distN=Math.hypot(dx,dz);
    if(distN<p[3]||distN>R)continue;
    const side=(dx*abz-dz*abx)/Math.max(distN,1e-4),w=side*side*2.4;
    this.d[k]=Math.min(soil.maxLift,this.d[k]+p[2]*w);this.g[k]*=.5;this.b[k]=1;
   }else{
    const r=dist/R;if(r>=1)continue;this.d[k]=Math.min(soil.maxLift,this.d[k]+p[0]*(1-r*r)**2);this.g[k]*=.5;this.b[k]=1;
   }
  }
  return removed;
 }
 emit(kind,x,z,radius,p){const op={kind,x,z,radius,p,step:this.fine.step};const removed=this.applyOp(op);this.history.push(op);this.fine.push(kind,x,z,radius,p);this.version++;return removed;}
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
 // A driven wheel between prev and hit: one capsule instead of a chain of discs.
 // The depth is sampled at the current wheel load; the ring berm still lands at
 // the current contact.
 stampSweep(prev,hit,load,demand,dt,dir=null,sinkage){
  const soil=this.profile,pressure=clamp(load/1000,0,2);if(pressure<=0)return 0;
  const target=sinkage>0?Math.min(sinkage,soil.maxDepth):soil.settle+soil.dig*clamp(demand,0,1);
  const removed=this.emit(OP.SWEEP,prev.x,prev.z,.4,[hit.x,hit.z,target,5]);
  if(removed>0){
   const weights=this.tubeWeights(prev,hit,.42,.7);
   const share=soil.conserve?removed*(1-clamp(demand,0,1)*soil.roost)/weights:removed*soil.lip;
   if(weights>0)this.emit(OP.RINGSWEEP,prev.x,prev.z,.7,[hit.x,hit.z,share,.42]);
  }
  return removed;
 }
 tubeWeights(prev,hit,rin,rout){
  const ax=prev.x,az=prev.z,bx=hit.x,bz=hit.z,abx=bx-ax,abz=bz-az,length2=Math.max(abx*abx+abz*abz,1e-8);let sum=0;
  for(let ix=Math.floor((Math.min(ax,bx)-rout)/FINE_CELL);ix<=Math.ceil((Math.max(ax,bx)+rout)/FINE_CELL);ix++)for(let iz=Math.floor((Math.min(az,bz)-rout)/FINE_CELL);iz<=Math.ceil((Math.max(az,bz)+rout)/FINE_CELL);iz++){
   const tRaw=((ix*FINE_CELL-ax)*abx+(iz*FINE_CELL-az)*abz)/length2;if(tRaw<0||tRaw>1)continue;const t=tRaw,dx=ix*FINE_CELL-ax-abx*t,dz=iz*FINE_CELL-az-abz*t,dist=Math.hypot(dx,dz);
   if(dist<rin||dist>rout)continue;const side=(dx*abz-dz*abx)/Math.max(dist,1e-4),w=side*side*2.4;if(w>=.05)sum+=w;
  }
  return sum;
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
   const distance=prev?Math.hypot(hit.x-prev.x,hit.z-prev.z):0;
   // Bridge normal travel, but never draw across recovery teleports.
   const dir=prev&&distance>1e-3&&distance<=4?{x:(hit.x-prev.x)/distance,z:(hit.z-prev.z)/distance}:null;
   const removed=distance>.05&&distance<=4
    ?this.stampSweep(prev,hit,hit.load,hit.demand??0,dt,dir,hit.sinkage)
    :this.stamp(hit.x,hit.z,hit.load,hit.demand??0,dt,dir,hit.sinkage);
   if(this.profile.roost>0&&dir&&(hit.demand??0)>0)this.throwRoost(hit.x,hit.z,dir.x,dir.z,removed*(hit.demand??0));
   this.previous[i]={x:hit.x,z:hit.z};
  }
 }
 resetContacts(){this.previous=[null,null];}
 // -------------------------------------------------------------- window ---
 // The local CPU copy follows the bike so the recovered terrain can sample it
 // every physics step. There is no second rigid-body world.
 recentre(x,z){
  const i0=Math.round(x/FINE_CELL)-SPAN/2,j0=Math.round(z/FINE_CELL)-SPAN/2;
  if(this.placed&&Math.abs(i0-this.i0)<16&&Math.abs(j0-this.j0)<16)return;
  const d=new Float32Array(SPAN*SPAN),g=new Float32Array(SPAN*SPAN),b=new Float32Array(SPAN*SPAN);
  if(this.placed)for(let j=0;j<SPAN;j++)for(let i=0;i<SPAN;i++){const k=this.local(i0+i,j0+j);if(k>=0){d[j*SPAN+i]=this.d[k];g[j*SPAN+i]=this.g[k];b[j*SPAN+i]=this.b[k];}}
  this.d=d;this.g=g;this.b=b;this.i0=i0;this.j0=j0;this.placed=true;this.fine.center(x,z);
 }
 follow(x,z){this.recentre(x,z);}
 // GPU truth for the local window; replay ops the readback did not include yet.
 applyReadback({data,i0,j0,w,h,step}){
  const record=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const k=this.local(i0+x,j0+y);if(k<0)continue;const p=(y*w+x)*4,d=data[p];
   if(Math.abs(d-this.d[k])>5e-4&&data[p+2]>.5)record.push([i0+x,j0+y]);
   this.d[k]=d;this.g[k]=data[p+1];this.b[k]=data[p+2];
  }
  let keep=0;for(const op of this.history)if(op.step>=step){this.history[keep++]=op;this.applyOp(op);}this.history.length=keep;
  this.version++;
  if(this.onCells&&record.length)this.onCells(record,this);
 }
 // Request the next readback of the local window (one in flight at a time).
 sync(){
  if(this.reading||!this.placed||!this.fine.enabled)return;this.reading=true;
  this.fine.read(this.i0,this.j0,SPAN,SPAN,this.flipRows).then(r=>this.applyReadback(r)).catch(()=>{}).finally(()=>{this.reading=false;});
 }
}
