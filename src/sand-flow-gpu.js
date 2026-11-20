import {DataTexture,FloatType,HalfFloatType,LinearFilter,NearestFilter,NodeMaterial,QuadMesh,RGBAFormat,RedFormat,RenderTarget,Vector2,Vector4} from 'three/webgpu';
import {Fn,Loop,clamp,float,floor,fract,length,max,min,mix,select,smoothstep,sqrt,texture,uniform,uv,vec2,vec4} from 'three/tsl';
import {FLOW} from './sand-flow-model.js';

// GPU sand step: the rules of sand-flow-model.js as TSL fragment passes on
// ping-pong float render targets (WebGPU, or WebGL2 via three's fallback).
// One texel per cell: R bed height h, G rolling layer r, B bedrock, A flowing.
// Cell (i, j) covers world x = -extent/2 + (i+½)·dx, z = -extent/2 + (j+½)·dx and
// is sampled at uv = (i+½, j+½)/n, the same convention as the track map.
//
// Coupling with the bike:
//  - inject(): rider-made soil changes (CPU, 25 cm) are averaged into cells and
//    added to the bed in the next step (mass conserving);
//  - readAround(): an async readback around the bike returns h + r so the CPU
//    sand patch can follow avalanches. offsetAt() is that flow-only change.
const TILE=64;
export class SandFlowGPU{
 constructor(renderer,{size=1024,extent=900}={}){
  this.renderer=renderer;this.n=size;this.extent=extent;this.dx=extent/size;this.enabled=false;this.accumulator=0;this.time=0;
  const options={type:FloatType,format:RGBAFormat,minFilter:NearestFilter,magFilter:NearestFilter,depthBuffer:false,generateMipmaps:false};
  this.targets=[new RenderTarget(size,size,options),new RenderTarget(size,size,options)];this.fluxTarget=new RenderTarget(size,size,options);this.current=0;
  this.initTexture=new DataTexture(new Float32Array(4),1,1,RGBAFormat,FloatType);
  this.staging=new DataTexture(new Float32Array(TILE*TILE),TILE,TILE,RedFormat,FloatType);this.staging.magFilter=this.staging.minFilter=NearestFilter;
  this.base=null;this.injected=null;this.pending=null;this.offsets=null;this.flipRows=false;this.reading=false;
  const tx=1/size;
  this.u={dt:uniform(1/60)};
  // Shared sampling helpers.
  this.stateNode=texture(this.targets[0].texture);this.fluxNode=texture(this.fluxTarget.texture);
  const S=o=>this.stateNode.sample(uv().add(o)),F=o=>this.fluxNode.sample(uv().add(o));
  const E=vec2(tx,0),W=vec2(-tx,0),N=vec2(0,tx),Sv=vec2(0,-tx),dx=float(this.dx),dt=this.u.dt;
  const descent=(c,e,w,n,s)=>length(vec2(max(0,max(c.sub(e),c.sub(w))),max(0,max(c.sub(n),c.sub(s))))).div(dx);
  const hStop=t=>{const tc=min(t,FLOW.tanMax-.01);return float(FLOW.hStop).mul(float(FLOW.tanMax).sub(tc)).div(max(tc.sub(FLOW.tanDynamic),1e-6));};
  // Pass 1: rolling-layer outflow to (+x, −x, +z, −z).
  this.fluxMaterial=new NodeMaterial();
  this.fluxMaterial.fragmentNode=Fn(()=>{
   const c=S(vec2(0)),z=c.x.add(c.y),r=c.y;
   const zE=S(E).x.add(S(E).y),zW=S(W).x.add(S(W).y),zN=S(N).x.add(S(N).y),zS=S(Sv).x.add(S(Sv).y);
   const t=descent(z,zE,zW,zN,zS),hs=hStop(t);
   const u=min(float(FLOW.beta).mul(sqrt(r.mul(FLOW.g))).mul(r).div(hs),dx.mul(FLOW.cfl).div(dt));
   const total=r.mul(min(FLOW.maxOut,u.mul(dt).div(dx)));
   const s=vec4(max(0,z.sub(zE)),max(0,z.sub(zW)),max(0,z.sub(zN)),max(0,z.sub(zS))),sum=s.x.add(s.y).add(s.z).add(s.w);
   const active=r.greaterThan(FLOW.minLayer).and(t.greaterThan(FLOW.tanDynamic)).and(sum.greaterThan(0));
   return select(active,s.mul(total.div(max(sum,1e-9))),vec4(0));
  })();
  // Pass 2: transport, injected rider changes, then bed/rolling exchange.
  this.stagingNode=texture(this.staging);this.rect=uniform(new Vector4(-1,-1,-1,-1));
  this.updateMaterial=new NodeMaterial();
  this.updateMaterial.fragmentNode=Fn(()=>{
   const p=uv(),c=S(vec2(0)),f=F(vec2(0));
   const inW=select(p.x.greaterThan(tx),F(W).x,0),inE=select(p.x.lessThan(1-tx),F(E).y,0),inS=select(p.y.greaterThan(tx),F(Sv).z,0),inN=select(p.y.lessThan(1-tx),F(N).w,0);
   const r0=max(0,c.y.sub(f.x.add(f.y).add(f.z).add(f.w)).add(inW).add(inE).add(inS).add(inN));
   // Rider changes: staging covers rect (uv min x,y – max x,y).
   const rc=this.rect,inside=p.x.greaterThan(rc.x).and(p.y.greaterThan(rc.y)).and(p.x.lessThan(rc.z)).and(p.y.lessThan(rc.w));
   const injected=select(inside,this.stagingNode.sample(p.sub(vec2(rc.x,rc.y)).div(vec2(rc.z.sub(rc.x),rc.w.sub(rc.y)))).r,0);
   const h0=c.x.add(injected),rock=c.z,wasFlowing=c.w.greaterThan(.5);
   const tanBed=descent(c.x,S(E).x,S(W).x,S(N).x,S(Sv).x),hs=select(tanBed.greaterThan(FLOW.tanDynamic),hStop(tanBed),1e9);
   const moving=wasFlowing.or(r0.greaterThan(FLOW.minLayer));
   const erode=min(float(FLOW.erosion).mul(tanBed.sub(FLOW.tanDynamic)).mul(r0.add(FLOW.seed)).mul(max(0,float(1).sub(r0.div(FLOW.rollMax)))).mul(dt),max(0,h0.sub(rock)));
   const settle=min(r0,r0.mul(FLOW.settleRate).mul(dt).add(max(0,float(FLOW.tanDynamic).sub(tanBed)).mul(FLOW.deposition).mul(dt)).add(select(r0.lessThan(FLOW.settle),r0,0)));
   const transfer=select(moving,select(r0.greaterThanEqual(hs),erode,settle.negate()),
    select(tanBed.greaterThan(FLOW.tanStatic).and(h0.greaterThan(rock.add(FLOW.minLayer))),min(min(hs.mul(1.5),FLOW.rollMax),h0.sub(rock)),0));
   let h=h0.sub(transfer),r=r0.add(transfer);
   const stops=r.lessThanEqual(FLOW.minLayer);
   h=select(stops,h.add(r),h);r=select(stops,0,r);
   return vec4(h,r,rock,select(stops,0,1));
  })();
  this.initMaterial=new NodeMaterial();this.initNode=texture(this.initTexture);this.initMaterial.fragmentNode=this.initNode.sample(uv());
  // Pass 3: terrain self-shadowing. March from each cell toward the sun over
  // the field; the penumbra widens with distance. 1 = lit, 0 = in shadow.
  // Half resolution: only used beyond the shadow cascades, so 1.76 m cells suffice.
  const shadowSize=Math.max(256,size/2);
  this.shadowTarget=new RenderTarget(shadowSize,shadowSize,{type:HalfFloatType,format:RGBAFormat,minFilter:LinearFilter,magFilter:LinearFilter,depthBuffer:false,generateMipmaps:false});
  this.sunXZ=uniform(new Vector2(1,0));this.sunTan=uniform(.25);this.shadowClock=1;
  this.shadowMaterial=new NodeMaterial();
  this.shadowMaterial.fragmentNode=Fn(()=>{
   // Bilinear heights (the field is nearest-filtered) and an angular test:
   // lit when the sun is above the steepest occluder, with a soft penumbra.
   const n=this.n,cellHeight=q=>{const t=q.mul(n).sub(.5),i=floor(t),f=fract(t),at=o=>{const c=this.stateNode.sample(i.add(o).add(.5).div(n));return c.x.add(c.y);};
    return mix(mix(at(vec2(0,0)),at(vec2(1,0)),f.x),mix(at(vec2(0,1)),at(vec2(1,1)),f.x),f.y);};
   const p=uv(),h0=cellHeight(p),horizon=float(-10).toVar();
   Loop({start:1,end:32,type:'int'},({i})=>{
    const step=float(i),d=step.mul(step).mul(.25).add(step.mul(1.4));
    horizon.assign(max(horizon,cellHeight(p.add(this.sunXZ.mul(d.div(extent)))).sub(h0.add(.05)).div(d)));
   });
   return vec4(smoothstep(horizon.sub(.025),horizon.add(.025),this.sunTan),0,0,1);
  })();
  this.quad=new QuadMesh();
 }
 get texture(){return this.targets[this.current].texture;}
 cellOf(x,z){const i=Math.floor((x+this.extent/2)/this.dx),j=Math.floor((z+this.extent/2)/this.dx);return i<0||j<0||i>=this.n||j>=this.n?-1:j*this.n+i;}
 // height(x,z) terrain; depth(x,z,h,slope) erodible sand thickness (m).
 reset(height,depth){
  const n=this.n,dx=this.dx,half=this.extent/2,data=new Float32Array(n*n*4);this.base=new Float32Array(n*n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)this.base[j*n+i]=height(-half+(i+.5)*dx,-half+(j+.5)*dx);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const k=j*n+i,h=this.base[k],e=this.base[j*n+Math.min(n-1,i+1)],w=this.base[j*n+Math.max(0,i-1)],no=this.base[Math.min(n-1,j+1)*n+i],so=this.base[Math.max(0,j-1)*n+i];
   const slope=Math.hypot(e-w,no-so)/(2*dx),d=Math.max(0,depth(-half+(i+.5)*dx,-half+(j+.5)*dx,h,slope));
   data.set([h,0,h-d,0],k*4);
  }
  this.injected=new Float32Array(n*n);this.pending=new Float32Array(n*n);this.pendingBox=null;this.offsets=new Float32Array(n*n);this.shadow=new Map();
  this.initTexture.image={data,width:n,height:n};this.initTexture.needsUpdate=true;
  for(const t of this.targets)this.pass(this.initMaterial,t);
  this.current=0;this.stateNode.value=this.targets[0].texture;this.enabled=true;this.accumulator=0;
  this.probeOrientation(data);
 }
 pass(material,target){this.quad.material=material;const r=this.renderer,previous=r.getRenderTarget();r.setRenderTarget(target);this.quad.render(r);r.setRenderTarget(previous);}
 // Read back row 0 to learn whether the backend stores rows bottom-up.
 async probeOrientation(data){
  const n=this.n,row=await this.renderer.readRenderTargetPixelsAsync(this.targets[0],0,0,4,1);
  const top=data[(n-1)*n*4],bottom=data[0];this.flipRows=Math.abs(row[0]-top)<Math.abs(row[0]-bottom)&&top!==bottom;
 }
 // Rider soil change at a 0.25 m node: dh metres over 0.0625 m².
 // cells are world 0.25 m node indices; deltaAt returns their current change.
 observe(cells,deltaAt){
  for(const [ix,iz] of cells){
   const key=ix+','+iz,d=deltaAt(ix,iz),dd=d-(this.shadow.get(key)??0);if(dd===0)continue;this.shadow.set(key,d);
   const k=this.cellOf(ix*.25,iz*.25);if(k<0)continue;
   this.pending[k]+=dd*.0625/(this.dx*this.dx);
   const i=k%this.n,j=(k-i)/this.n,b=this.pendingBox;
   this.pendingBox=b?{minX:Math.min(b.minX,i),minY:Math.min(b.minY,j),maxX:Math.max(b.maxX,i+1),maxY:Math.max(b.maxY,j+1)}:{minX:i,minY:j,maxX:i+1,maxY:j+1};
  }
 }
 stageInjection(){
  const b=this.pendingBox;this.rect.value.set(-1,-1,-1,-1);if(!b)return;
  const n=this.n,w=Math.min(TILE,b.maxX-b.minX),h=Math.min(TILE,b.maxY-b.minY),stage=this.staging.image.data;stage.fill(0);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(b.minY+y)*n+b.minX+x;stage[y*TILE+x]=this.pending[k];this.injected[k]+=this.pending[k];this.pending[k]=0;}
  this.staging.needsUpdate=true;
  // The staging tile is TILE wide; the rect maps only its used part.
  this.rect.value.set(b.minX/n,b.minY/n,(b.minX+TILE)/n,(b.minY+TILE)/n);
  this.pendingBox=b.maxX-b.minX>TILE||b.maxY-b.minY>TILE?this.remainingBox(b,w,h):null;
 }
 remainingBox(b,w,h){
  // Anything outside the uploaded tile stays pending for the next frame.
  let box=null;const n=this.n;
  for(let j=b.minY;j<b.maxY;j++)for(let i=b.minX;i<b.maxX;i++){if(i<b.minX+w&&j<b.minY+h)continue;if(this.pending[j*n+i]===0)continue;box=box?{minX:Math.min(box.minX,i),minY:Math.min(box.minY,j),maxX:Math.max(box.maxX,i+1),maxY:Math.max(box.maxY,j+1)}:{minX:i,minY:j,maxX:i+1,maxY:j+1};}
  return box;
 }
 // Recompute terrain shadows for sun direction (unit, world) every quarter second.
 shadows(sun,frameDt){
  if(!this.enabled)return;this.shadowClock+=frameDt;if(this.shadowClock<2)return;this.shadowClock=0;
  const horizontal=Math.hypot(sun.x,sun.z)||1;this.sunXZ.value.set(sun.x/horizontal,sun.z/horizontal);this.sunTan.value=sun.y/horizontal;
  this.stateNode.value=this.targets[this.current].texture;this.pass(this.shadowMaterial,this.shadowTarget);
 }
 // Fixed 60 Hz steps, at most two per frame.
 update(frameDt){
  if(!this.enabled)return;
  // 30 Hz is plenty for dune-scale avalanches and halves the GPU cost.
  const step=1/30;this.u.dt.value=step;
  this.accumulator=Math.min(this.accumulator+frameDt,2*step);let first=true;
  while(this.accumulator>=step){
   this.accumulator-=step;this.time+=step;
   if(first)this.stageInjection();else this.rect.value.set(-1,-1,-1,-1);first=false;
   const src=this.targets[this.current],dst=this.targets[1-this.current];
   this.stateNode.value=src.texture;this.pass(this.fluxMaterial,this.fluxTarget);
   this.pass(this.updateMaterial,dst);this.current=1-this.current;this.stateNode.value=dst.texture;
  }
 }
 // Async readback of a square of cells around (x,z). Resolves with the cells
 // whose flow offset changed by more than `epsilon` metres.
 async readAround(x,z,radius=32,epsilon=.003){
  if(!this.enabled||this.reading)return null;this.reading=true;
  try{
   const n=this.n,k=this.cellOf(x,z);if(k<0)return null;const ci=k%n,cj=(k-ci)/n;
   const i0=Math.max(0,ci-radius),j0=Math.max(0,cj-radius),w=Math.min(n,ci+radius)-i0,h=Math.min(n,cj+radius)-j0;
   const y0=this.flipRows?n-(j0+h):j0,pixels=await this.renderer.readRenderTargetPixelsAsync(this.targets[this.current],i0,y0,w,h);
   const changed=[];
   for(let y=0;y<h;y++)for(let x2=0;x2<w;x2++){
    const row=this.flipRows?h-1-y:y,p=(row*w+x2)*4,c=(j0+y)*n+i0+x2;
    const offset=pixels[p]+pixels[p+1]-this.base[c]-this.injected[c];
    if(Math.abs(offset-this.offsets[c])>epsilon){this.offsets[c]=offset;changed.push(c);}
   }
   return changed;
  }finally{this.reading=false;}
 }
 // Initial coarse surface (no avalanches), bilinear: the reference that fine
 // nodes store their exact-terrain residual against.
 baseAt(x,z){
  if(!this.base)return 0;
  const n=this.n,gx=(x+this.extent/2)/this.dx-.5,gz=(z+this.extent/2)/this.dx-.5,i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j;
  const at=(a,b)=>this.base[Math.min(n-1,Math.max(0,b))*n+Math.min(n-1,Math.max(0,a))];
  return (at(i,j)*(1-u)+at(i+1,j)*u)*(1-v)+(at(i,j+1)*(1-u)+at(i+1,j+1)*u)*v;
 }
 // CPU height of the coarse field (h + r), bilinear between cell centres:
 // the same surface the GPU renders, so physics and visuals agree.
 heightAt(x,z){
  if(!this.base)return 0;
  const n=this.n,gx=(x+this.extent/2)/this.dx-.5,gz=(z+this.extent/2)/this.dx-.5,i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j;
  const at=(a,b)=>{const k=Math.min(n-1,Math.max(0,b))*n+Math.min(n-1,Math.max(0,a));return this.base[k]+(this.offsets?.[k]??0);};
  return (at(i,j)*(1-u)+at(i+1,j)*u)*(1-v)+(at(i,j+1)*(1-u)+at(i+1,j+1)*u)*v;
 }
 // Flow-only height change at a world point (bilinear between cell centres).
 offsetAt(x,z){
  if(!this.offsets)return 0;
  const n=this.n,gx=(x+this.extent/2)/this.dx-.5,gz=(z+this.extent/2)/this.dx-.5,i=Math.floor(gx),j=Math.floor(gz),u=gx-i,v=gz-j;
  const at=(a,b)=>this.offsets[Math.min(n-1,Math.max(0,b))*n+Math.min(n-1,Math.max(0,a))];
  return (at(i,j)*(1-u)+at(i+1,j)*u)*(1-v)+(at(i,j+1)*(1-u)+at(i+1,j+1)*u)*v;
 }
 // Diagnostics: share of shadowed cells in the terrain shadow map.
 async shadowStats(){
  const px=await this.renderer.readRenderTargetPixelsAsync(this.shadowTarget,0,0,this.n,this.n);let dark=0,partial=0;
  for(let k=0;k<this.n*this.n;k++){const v=px[k*4];if(v<.05)dark++;else if(v<.95)partial++;}
  return {dark:dark/(this.n*this.n),partial:partial/(this.n*this.n),sunXZ:this.sunXZ.value.toArray(),sunTan:this.sunTan.value};
 }
 // Diagnostics: whole-field totals (one full readback; not for every frame).
 async totals(){
  if(!this.enabled)return null;const px=await this.renderer.readRenderTargetPixelsAsync(this.targets[this.current],0,0,this.n,this.n);
  let volume=0,base=0,injected=0,flowing=0,rolling=0;
  for(let k=0;k<this.n*this.n;k++){volume+=px[k*4]+px[k*4+1];base+=this.base[k];injected+=this.injected[k];if(px[k*4+3]>.5)flowing++;rolling=Math.max(rolling,px[k*4+1]);}
  const area=this.dx*this.dx;return {netChange:(volume-base-injected)*area,moved:volume*area,flowing,maxRolling:rolling,time:this.time,flipRows:this.flipRows};
 }
 disable(){this.enabled=false;this.offsets=null;}
 dispose(){
  this.disable();
  for(const t of this.targets)t?.dispose();
  this.fluxTarget?.dispose();this.shadowTarget?.dispose();
  this.staging?.dispose();this.initTexture?.dispose();
  for(const m of [this.fluxMaterial,this.updateMaterial,this.shadowMaterial,this.initMaterial])m?.dispose?.();
 }
}
