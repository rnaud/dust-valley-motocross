import * as THREE from 'three';
import {FloatType,NearestFilter,NodeMaterial,QuadMesh,RGBAFormat,RenderTarget,RepeatWrapping} from 'three/webgpu';
import {Fn,Loop,If,abs,dot,float,floor,fract,int,length,max,min,mix,mod,mx_noise_float,select,smoothstep,texture,uniform,uniformArray,uv,vec2,vec3,vec4} from 'three/tsl';

// Fine sand field on the GPU: 25 cm nodes in a window that scrolls with the
// bike (toroidal storage, so scrolling never copies data). Each texel holds
//   R  d   height relative to the coarse avalanche field (ripples, ruts, berms)
//   G  compaction (0..1), B  disturbance (1 = freshly worked, fades as ripples return).
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
export const OP={DIG:0,RING:1,DISC:2};
export const MAX_OPS=24;
export const RIPPLE=Object.freeze({hop:5,emission:2.2e-5,growth:1.6,amplitude:.045,creep:.012,wavelength:1.25});

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
  this.trackNode=texture(new THREE.DataTexture(new Uint8Array(4),1,1));this.stateNode=texture(this.targets[0].texture);
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
   // 1. Seed for nodes entering the window: recorded ruts + a ripple train.
   const record=this.trackNode.sample(pos.add(450).div(900));
   const warp=mx_noise_float(vec3(pos.mul(.018),0)).mul(7).add(mx_noise_float(vec3(pos.mul(.07),7)).mul(1.8));
   const phase=fract(dot(pos,this.wind).div(RIPPLE.wavelength).add(warp));
   // Asymmetric ripple: long stoss slope, short steep lee face.
   const ripple=select(phase.lessThan(.78),smoothstep(0,.78,phase),float(1).sub(smoothstep(.78,1,phase))).sub(.5).mul(RIPPLE.amplitude*2).mul(this.windOn);
   const seeded=vec4(record.g.mul(.25).sub(record.r.mul(.4)).add(ripple.mul(float(1).sub(record.b))),record.b.mul(.5),record.b,0);
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
    If(kind.greaterThan(1.5).and(r.lessThan(1)),()=>{
     d.assign(min(this.maxLift,d.add(b.x.mul(float(1).sub(r.mul(r)).pow(2)))));packed.assign(packed.mul(.5));disturbed.assign(1);
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
   return vec4(next,packed,max(0,disturbed.sub(.0004)),0);
  })();
  return material;
 }
 // track: the world rut record (TrackMap texture) used to seed entering nodes.
 reset(track,{wind={x:1,z:0},ripples=true,maxDepth=.34,maxLift=.22}={}){
  this.trackNode.value=track;this.wind.value.set(wind.x,wind.z).normalize();this.windOn.value=ripples?1:0;
  this.maxDepth.value=maxDepth;this.maxLift.value=maxLift;this.previousOrigin.value.set(-1e7,-1e7);this.queue=[];this.step=0;this.enabled=true;this.needsSeed=true;
 }
 // Centre the window on a world point (snapped to 4-node steps).
 center(x,z){
  const half=this.n/2,i=Math.round(x/FINE_CELL/4)*4-half,j=Math.round(z/FINE_CELL/4)*4-half;
  if(this.needsSeed){this.origin.value.set(i,j);return;}
  this.pendingOrigin=[i,j];
 }
 push(kind,x,z,radius,p){this.queue.push({kind,x,z,radius,p,step:this.step});}
 pass(target){const r=this.renderer,previous=r.getRenderTarget();r.setRenderTarget(target);this.quad.render(r);r.setRenderTarget(previous);}
 update(dt){
  if(!this.enabled)return;
  this.accumulator=Math.min(this.accumulator+dt,2/60);
  while(this.accumulator>=1/60||this.needsSeed){
   this.accumulator=Math.max(0,this.accumulator-1/60);
   const o=this.origin.value;this.previousOrigin.value.copy(this.needsSeed?new THREE.Vector2(-1e7,-1e7):o);
   if(this.pendingOrigin){o.set(...this.pendingOrigin);this.pendingOrigin=null;}
   this.needsSeed=false;
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
  }
 }
 get texture(){return this.targets[this.current].texture;}
 // Async readback of w×h world nodes starting at (i0, j0). Handles the
 // toroidal wrap (up to four rectangles) and bottom-up rows (WebGL).
 async read(i0,j0,w,h,flipRows){
  const n=this.n,step=this.step,target=this.targets[this.current],out=new Float32Array(w*h*4);
  const ox=((i0%n)+n)%n,oy=((j0%n)+n)%n,xs=[[0,Math.min(w,n-ox)]],ys=[[0,Math.min(h,n-oy)]];
  if(xs[0][1]<w)xs.push([xs[0][1],w]);if(ys[0][1]<h)ys.push([ys[0][1],h]);
  await Promise.all(xs.flatMap(([xa,xb])=>ys.map(async([ya,yb])=>{
   const tx=(ox+xa)%n,ty=(oy+ya)%n,rw=xb-xa,rh=yb-ya,qy=flipRows?n-(ty+rh):ty;
   const px=await this.renderer.readRenderTargetPixelsAsync(target,tx,qy,rw,rh);
   for(let y=0;y<rh;y++){const row=flipRows?rh-1-y:y;out.set(px.subarray(row*rw*4,(row+1)*rw*4),((ya+y)*w+xa)*4);}
  })));
  return {data:out,i0,j0,w,h,step};
 }
 disable(){this.enabled=false;}
}
