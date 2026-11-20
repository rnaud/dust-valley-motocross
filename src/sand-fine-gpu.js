import * as THREE from 'three';
import {FloatType,NearestFilter,NodeMaterial,QuadMesh,RGBAFormat,RenderTarget,RepeatWrapping} from 'three/webgpu';
import {rippleHeight} from './ripple-seed.js';
import {SandMemory} from './sand-memory-gpu.js';
import {Fn,Loop,If,abs,clamp,dot,float,floor,fract,int,length,max,min,mix,mod,mx_noise_float,select,smoothstep,texture,uniform,uniformArray,uv,vec2,vec3,vec4} from 'three/tsl';

// Fine sand field on the GPU: 25 cm nodes in a window that scrolls with the
// bike (toroidal storage, so scrolling never copies data). Each texel holds
//   R  d   height relative to the coarse avalanche field (ripples, ruts, berms)
//   G  compaction (0..1), B  disturbance (1 = freshly worked, fades as ripples return),
//   A  residual: exact terrain minus the bilinear coarse field (crisp crests).
//      Static per node; the surface is coarse + A + R.
// Nodes sit at world (I·0.25, J·0.25), the same lattice as the CPU sand model, so
// CPU-predicted deformation and the GPU state agree node for node.
//
// One pass per 60 Hz step, reading the previous state:
//  1. nodes that scrolled into view start from the persistent track record
//     plus a seed ripple train;
//  2. deformation ops from the bike (dig discs, side berms, roost/clod/gouge
//     deposits) exactly as the CPU sand model computes them;
//  3. rut walls slump past the dynamic angle of repose (pairwise, conserving);
//  4. wind ripples evolve by a Nishimori–Ouchi style rule: saltation hops a
//     fixed distance downwind with height-dependent emission (crests emit
//     more, which grows ripples at about the hop length), plus creep diffusion.
export const FINE_CELL=.25;
export const OP={DIG:0,RING:1,DISC:2,SWEEP:3,RINGSWEEP:4};
export const MAX_OPS=24;
export const RIPPLE=Object.freeze({hop:5,emission:2.2e-5,growth:1.6,amplitude:.045,creep:.00015,wavelength:1.25});

export class FineSandGPU{
 constructor(renderer,{size=512}={}){
  this.renderer=renderer;this.n=size;this.enabled=false;this.step=0;this.accumulator=0;
  const options={type:FloatType,format:RGBAFormat,minFilter:NearestFilter,magFilter:NearestFilter,wrapS:RepeatWrapping,wrapT:RepeatWrapping,depthBuffer:false,generateMipmaps:false};
  this.targets=[new RenderTarget(size,size,options),new RenderTarget(size,size,options)];this.current=0;
  for(const t of this.targets){t.texture.wrapS=t.texture.wrapT=RepeatWrapping;}
  this.origin=uniform(new THREE.Vector2(0,0));this.previousOrigin=uniform(new THREE.Vector2(-1e7,-1e7));
  this.wind=uniform(new THREE.Vector2(1,0));this.windOn=uniform(1);this.limit=uniform(Math.tan(31*Math.PI/180)*FINE_CELL);
  this.maxDepth=uniform(.34);this.maxLift=uniform(.22);this.opCount=uniform(0,'int');
  this.opData=Array.from({length:MAX_OPS*2},()=>new THREE.Vector4());this.ops=uniformArray(this.opData,'vec4');
  this.stateNode=texture(this.targets[0].texture);
  // Persistent 25 cm world map, reused across window moves.
  this.memory=new SandMemory(renderer,{size:size<=256?1024:2048});this.memoryNode=texture(this.memory.texture);this.memN=uniform(this.memory.n);
  this.residual=new THREE.DataTexture(new Float32Array(size*size),size,size,THREE.RedFormat,THREE.FloatType);this.residual.magFilter=this.residual.minFilter=NearestFilter;
  this.residualNode=texture(this.residual);this.residualFn=null;this.residualOrigin=null;
  this.residualStaging=new THREE.DataTexture(new Float32Array(64*64),64,64,THREE.RedFormat,THREE.FloatType);this.stageRegion=new THREE.Box2();this.stageOrigin=new THREE.Vector2();this.residualReady=false;
  this.queue=[];this.material=this.buildMaterial();this.quad=new QuadMesh(this.material);
 }
 buildMaterial(){
  const n=this.n,S=this.stateNode,o=this.origin,po=this.previousOrigin;
  const material=new NodeMaterial();
  material.fragmentNode=Fn(()=>{
   const t=floor(uv().mul(n)),origin=o;
   // World node of this texel, and whether a neighbour offset stays in the window.
   const world=origin.add(mod(t.sub(mod(origin,n)).add(n),n));
   const inWindow=w=>w.x.greaterThanEqual(origin.x).and(w.x.lessThan(origin.x.add(n))).and(w.y.greaterThanEqual(origin.y)).and(w.y.lessThan(origin.y.add(n)));
   const at=w=>S.sample(mod(w,n).add(.5).div(n));
   const self=at(world);
   const wasInside=world.x.greaterThanEqual(po.x).and(world.x.lessThan(po.x.add(n))).and(world.y.greaterThanEqual(po.y)).and(world.y.lessThan(po.y.add(n)));
   const pos=world.mul(FINE_CELL);
   // 1. Seed for nodes entering the window: the persistent 25 cm record if it
   // has been written, otherwise a fresh ripple train.
   const ripple=rippleHeight(pos,this.wind,float(RIPPLE.amplitude)).mul(this.windOn);
   const residual=this.residualNode.sample(mod(world,n).add(.5).div(n)).r;
   const mem=this.memoryNode.sample(mod(world,this.memN).add(.5).div(this.memN));
   const seeded=select(mem.w.greaterThan(.5),vec4(mem.x,mem.y,mem.z,residual),vec4(ripple,0,0,residual));
   const state=select(wasInside,self,seeded).toVar();
   const d=state.x.toVar(),packed=state.y.toVar(),disturbed=state.z.toVar();
   // 2. Deformation ops.
   Loop({start:int(0),end:this.opCount,type:'int'},({i})=>{
    const a=this.ops.element(i.mul(2)),b=this.ops.element(i.mul(2).add(1)),kind=a.x,offset=pos.sub(a.yz),r=length(offset).div(a.w);
    If(kind.lessThan(.5).and(r.lessThan(1)),()=>{
     const w=float(1).sub(r.mul(r)).pow(2),amount=max(0,b.x.mul(w).sub(max(0,d.negate()))).mul(b.y);
     d.assign(max(this.maxDepth.negate(),d.sub(amount)));packed.assign(max(0,min(1,packed.add(amount.mul(b.z)))));disturbed.assign(1);
    });
    If(kind.greaterThan(.5).and(kind.lessThan(1.5)),()=>{
     const dist=length(offset),dir=vec2(b.z,b.w),side=dot(offset,vec2(dir.y,dir.x.negate())).div(max(dist,1e-4));
     const w=select(length(dir).greaterThan(.5),side.mul(side).mul(2.4),float(1));
     If(dist.greaterThanEqual(b.x).and(dist.lessThanEqual(a.w)).and(w.greaterThanEqual(.05)),()=>{d.assign(min(this.maxLift,d.add(b.y.mul(w))));disturbed.assign(1);});
    });
    If(kind.greaterThan(1.5).and(kind.lessThan(2.5)).and(r.lessThan(1)),()=>{
     d.assign(min(this.maxLift,d.add(b.x.mul(float(1).sub(r.mul(r)).pow(2)))));packed.assign(packed.mul(.5));disturbed.assign(1);
    });
    // A swept wheel: from this op's centre to b.xy, depth b.z, packing b.w.
    // Distance to the segment, not to a point, so a wheel at speed carves a
    // continuous trench instead of a chain of discs.
    const ab=vec2(b.x,b.y).sub(a.yz),len2=max(dot(ab,ab),1e-8),tRaw=dot(offset,ab).div(len2),tt=clamp(tRaw,0,1),rr=length(offset.sub(ab.mul(tt))).div(a.w);
    If(kind.greaterThan(2.5).and(kind.lessThan(3.5)).and(rr.lessThan(1)),()=>{
     const w=float(1).sub(rr.mul(rr)).pow(2),amount=max(0,b.z.mul(w).sub(max(0,d.negate())));
     d.assign(max(this.maxDepth.negate(),d.sub(amount)));packed.assign(max(0,min(1,packed.add(amount.mul(b.w)))));disturbed.assign(1);
    });
    // A swept berm: a tube along the wheel path, only in the side band. This
    // keeps the lip continuous instead of leaving one ring-shaped lump per
    // physics step.
    const distN=length(offset.sub(ab.mul(tt))),side=offset.x.mul(ab.y).sub(offset.y.mul(ab.x)).div(max(distN,1e-4));
    If(kind.greaterThan(3.5).and(tRaw.greaterThan(0)).and(tRaw.lessThan(1)).and(distN.greaterThan(b.w)).and(distN.lessThan(a.w)),()=>{
     const w=side.mul(side).mul(2.4);
     d.assign(min(this.maxLift,d.add(b.z.mul(w))));packed.assign(packed.mul(.5));disturbed.assign(1);
    });
   });
   // Neighbour detail heights (outside the window: treat as this node).
   const nb=off=>{const w=world.add(off);return select(inWindow(w),at(w).x,d);};
   const dE=nb(vec2(1,0)),dW=nb(vec2(-1,0)),dN=nb(vec2(0,1)),dS=nb(vec2(0,-1));
   // 3. Slumping past the angle of repose (antisymmetric, so volume conserving).
   const lim=this.limit,slump=(m)=>max(0,m.sub(d).sub(lim)).sub(max(0,d.sub(m).sub(lim)));
   const slumped=slump(dE).add(slump(dW)).add(slump(dN)).add(slump(dS)).mul(.25);
   // 4. Ripples: saltation from upwind (bilinear source), creep diffusion.
   const emit=h=>max(0,float(1).add(h.mul(RIPPLE.growth/RIPPLE.amplitude))).mul(RIPPLE.emission).mul(this.windOn);
   const src=world.sub(this.wind.mul(RIPPLE.hop)),si=floor(src),sf=src.sub(si);
   const sd=o2=>{const w=si.add(o2);return select(inWindow(w),at(w).x,d);};
   const upwind=mix(mix(sd(vec2(0,0)),sd(vec2(1,0)),sf.x),mix(sd(vec2(0,1)),sd(vec2(1,1)),sf.x),sf.y);
   const creep=dE.add(dW).add(dN).add(dS).sub(d.mul(4)).mul(RIPPLE.creep);
   const next=d.add(slumped).add(emit(upwind).sub(emit(d))).add(creep);
   return vec4(next,packed,max(0,disturbed.sub(.0004)),state.w);
  })();
  return material;
 }
 reset({wind={x:1,z:0},ripples=true,maxDepth=.34,maxLift=.22,residual=null}={}){
  this.residualFn=residual;this.residualOrigin=null;
  this.wind.value.set(wind.x,wind.z).normalize();this.windOn.value=ripples?1:0;
  this.maxDepth.value=maxDepth;this.maxLift.value=maxLift;this.previousOrigin.value.set(-1e7,-1e7);this.queue=[];this.step=0;this.enabled=true;this.needsSeed=true;
  this.memory.clear();
 }
 // Centre the window on a world point (snapped to 4-node steps).
 center(x,z){
  const half=this.n/2,i=Math.round(x/FINE_CELL/4)*4-half,j=Math.round(z/FINE_CELL/4)*4-half;
  this.fillResidual(i,j);
  if(this.needsSeed){this.origin.value.set(i,j);return;}
  this.pendingOrigin=[i,j];
 }
 // Exact-terrain residual for nodes entering the window (toroidal layout).
 // Only the strips that scroll in are computed and uploaded (staging copies);
 // re-uploading the whole 1 MB texture on every shift caused periodic hitches.
 fillResidual(i0,j0){
  if(!this.residualFn)return;const n=this.n,data=this.residual.image.data,prev=this.residualOrigin;
  if(prev&&prev[0]===i0&&prev[1]===j0)return;
  const full=!prev||Math.abs(i0-prev[0])>=n||Math.abs(j0-prev[1])>=n,rects=[];
  for(let j=j0;j<j0+n;j++)for(let i=i0;i<i0+n;i++){
   if(!full&&i>=prev[0]&&i<prev[0]+n&&j>=prev[1]&&j<prev[1]+n)continue;
   data[(((j%n)+n)%n)*n+(((i%n)+n)%n)]=this.residualFn(i*FINE_CELL,j*FINE_CELL);
  }
  this.residualOrigin=[i0,j0];
  if(full||!this.residualReady){this.residual.needsUpdate=true;this.residualReady=false;return;}
  // Entering columns and rows, as texel rectangles (each may wrap once).
  const wrap=(start,len)=>{const a=((start%n)+n)%n;return a+len<=n?[[a,len]]:[[a,n-a],[0,a+len-n]];};
  const di=i0-prev[0],dj=j0-prev[1];
  if(di)for(const [x,w] of wrap(di>0?prev[0]+n:i0,Math.abs(di)))rects.push([x,0,w,n]);
  if(dj)for(const [y,h] of wrap(dj>0?prev[1]+n:j0,Math.abs(dj)))rects.push([0,y,n,h]);
  for(const [x0,y0,w,h] of rects)for(let y=y0;y<y0+h;y+=64)for(let x=x0;x<x0+w;x+=64){
   const tw=Math.min(64,x0+w-x),th=Math.min(64,y0+h-y),stage=this.residualStaging.image.data;
   for(let r=0;r<th;r++)stage.set(data.subarray((y+r)*n+x,(y+r)*n+x+tw),r*64);
   this.residualStaging.needsUpdate=true;this.stageRegion.min.set(0,0);this.stageRegion.max.set(tw,th);this.stageOrigin.set(x,y);
   this.renderer.copyTextureToTexture(this.residualStaging,this.residual,this.stageRegion,this.stageOrigin);
  }
 }
 push(kind,x,z,radius,p){this.queue.push({kind,x,z,radius,p,step:this.step});}
 pass(target){const r=this.renderer,previous=r.getRenderTarget();r.setRenderTarget(target);this.quad.render(r);r.setRenderTarget(previous);}
 update(dt){
  if(!this.enabled)return;
  this.accumulator=Math.min(this.accumulator+dt,2/60);
  while(this.accumulator>=1/60||this.needsSeed){
   this.accumulator=Math.max(0,this.accumulator-1/60);
   const o=this.origin.value;this.previousOrigin.value.copy(this.needsSeed?new THREE.Vector2(-1e7,-1e7):o);
   if(this.pendingOrigin){this.memory.write(this);o.set(...this.pendingOrigin);this.pendingOrigin=null;}
   this.needsSeed=false;if(this.residual.version>0&&!this.residualReady){this.renderer.initTexture(this.residual);this.residualReady=true;}
   // Ops beyond MAX_OPS spill into extra passes in the same step.
   let batch=this.queue.splice(0,MAX_OPS);
   do{
    batch.forEach((op,k)=>{this.opData[k*2].set(op.kind,op.x,op.z,op.radius);this.opData[k*2+1].set(...op.p);});
    this.opCount.value=batch.length;
    const src=this.targets[this.current],dst=this.targets[1-this.current];this.stateNode.value=src.texture;this.pass(dst);
    this.current=1-this.current;this.stateNode.value=dst.texture;this.previousOrigin.value.copy(o);
    batch=this.queue.length?this.queue.splice(0,MAX_OPS):null;
   }while(batch);
   this.step++;
   if(this.step%8===0)this.memory.write(this);
  }
 }
 get texture(){return this.targets[this.current].texture;}
 // Async readback of w×h world nodes starting at (i0, j0). Handles the
 // toroidal wrap (up to four rectangles) and bottom-up rows (WebGL).
 async read(i0,j0,w,h,flipRows){
  const n=this.n,step=this.step,target=this.targets[this.current],out=new Float32Array(w*h*4);
  // i0/j0 are world node indices; the toroidal texture is indexed relative to
  // the current window origin.
  const ox=(((i0-this.origin.value.x)%n)+n)%n,oy=(((j0-this.origin.value.y)%n)+n)%n;
  const xs=[[0,Math.min(w,n-ox)]],ys=[[0,Math.min(h,n-oy)]];
  if(xs[0][1]<w)xs.push([xs[0][1],w]);if(ys[0][1]<h)ys.push([ys[0][1],h]);
  await Promise.all(xs.flatMap(([xa,xb])=>ys.map(async([ya,yb])=>{
   const tx=(ox+xa)%n,ty=(oy+ya)%n,rw=xb-xa,rh=yb-ya,qy=flipRows?n-(ty+rh):ty;
   const px=await this.renderer.readRenderTargetPixelsAsync(target,tx,qy,rw,rh);
   for(let y=0;y<rh;y++){const row=flipRows?rh-1-y:y;out.set(px.subarray(row*rw*4,(row+1)*rw*4),((ya+y)*w+xa)*4);}
  })));
  return {data:out,i0,j0,w,h,step};
 }
 disable(){this.enabled=false;}
 dispose(){
  this.disable();
  for(const t of this.targets)t?.dispose();
  this.residual?.dispose();this.residualStaging?.dispose();
  this.memory?.dispose();this.material?.dispose?.();
 }
}
