// Bounded deterministic soil approximation, separate from MCM parity. Wheel load
// settles the bed; drive demand deepens ruts. Optional per-map soil profiles add
// angle-of-repose slumping of rut walls and roost thrown behind the driven wheel.
// Not a granular or wheel-slip solver.
export const SAND_SPACING=.25,SAND_SEGMENTS=64,SAND_TILE_SIZE=16;
// Defaults reproduce the original soil exactly. repose (degrees) and roost are
// off unless a map asks for them.
export const DEFAULT_SOIL=Object.freeze({maxDepth:.14,maxLift:.045,settle:.045,dig:.075,lip:.012,plough:.06,packRelief:.025,repose:0,roost:0,gouge:0,sideLip:false,conserve:false,terra:null});
const key=(x,z)=>`${x},${z}`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class SandSurface {
 constructor(baseHeight,{maxStoredTiles=128,soil={}}={}){
  this.baseHeight=baseHeight;this.maxStoredTiles=Math.max(16,maxStoredTiles);
  this.profile={...DEFAULT_SOIL,...soil};this.baseCache=new Map();
  this.soil=new Map();this.tiles=new Map();this.version=0;this.bounds=null;
  this.previous=[null,null];this.dirty=new Set();this.changed=new Map();this.center='';
  // Optional observers: onCells(cells) sees every changed soil node before collision refresh;
  // events collects body impacts (x,z,vx,vz,amount) for spray effects.
  this.onCells=null;this.events=[];
 }
 // Base terrain heights are cached per 64×64-node tile: procedural terrain
 // (the jump park especially) is far too slow to re-evaluate per node.
 base(ix,iz){
  const tx=Math.floor(ix/64),tz=Math.floor(iz/64),id=key(tx,tz),i=(iz-tz*64)*64+ix-tx*64;
  let cache=this.baseCache.get(id);
  if(!cache){
   cache=new Float64Array(4096);for(let j=0;j<64;j++)for(let k=0;k<64;k++)cache[j*64+k]=this.baseHeight((tx*64+k)*.25,(tz*64+j)*.25);
   this.baseCache.set(id,cache);if(this.baseCache.size>this.maxStoredTiles*2)this.baseCache.delete(this.baseCache.keys().next().value);
  }
  return cache[i];
 }
 node(ix,iz){
  const tx=Math.floor(ix/64),tz=Math.floor(iz/64),tile=this.soil.get(key(tx,tz));
  return this.base(ix,iz)+(tile?.delta[(iz-tz*64)*64+ix-tx*64]??0);
 }
 deltaAt(ix,iz){const tx=Math.floor(ix/64),tz=Math.floor(iz/64);return this.soil.get(key(tx,tz))?.delta[(iz-tz*64)*64+ix-tx*64]??0;}
 displacementAt(x,z){return this.sample(x,z,(ix,iz)=>this.node(ix,iz)-this.base(ix,iz));}
 height(x,z){return this.sample(x,z,(ix,iz)=>this.node(ix,iz));}
 sample(x,z,node){
  const gx=x/.25,gz=-z/.25,ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz;
  const a=node(ix,-iz),b=node(ix+1,-iz),c=node(ix,-iz-1),d=node(ix+1,-iz-1);
  return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
 }
 compaction(x,z){
  const ix=Math.round(x/.25),iz=Math.round(z/.25),tx=Math.floor(ix/64),tz=Math.floor(iz/64);
  return this.soil.get(key(tx,tz))?.compaction[(iz-tz*64)*64+ix-tx*64]??0;
 }
 cell(ix,iz){
  const tx=Math.floor(ix/64),tz=Math.floor(iz/64),id=key(tx,tz);
  let tile=this.soil.get(id);
  if(!tile)tile={delta:new Float32Array(4096),compaction:new Float32Array(4096)};
  else this.soil.delete(id);
  this.soil.set(id,tile);
  return {tile,index:(iz-tz*64)*64+ix-tx*64};
 }
 mark(ix,iz){this.changed.set(key(ix,iz),[ix,iz]);}
 stamp(x,z,load,demand,dt,dir=null,sinkage){
  const soil=this.profile,low=-soil.maxDepth,high=soil.maxLift;
  // Terramechanics soils sink to the Bekker depth; others use tuned settle/dig.
  const pressure=clamp(load/1000,0,2),target=sinkage>0?Math.min(sinkage,soil.maxDepth):soil.settle+soil.dig*clamp(demand,0,1);
  if(pressure<=0)return 0;
  let removed=0;
  for(let ix=Math.floor((x-.4)/.25);ix<=Math.ceil((x+.4)/.25);ix++)for(let iz=Math.floor((z-.4)/.25);iz<=Math.ceil((z+.4)/.25);iz++){
   const r=Math.hypot(ix*.25-x,iz*.25-z)/.4;if(r>=1)continue;
   const {tile,index}=this.cell(ix,iz),weight=(1-r*r)**2,old=tile.delta[index],depth=Math.max(0,-old);
   // Settle within a rolling tire's short contact time; slow settling hid ruts at riding speed.
   const amount=Math.max(0,target*weight-depth)*(1-Math.exp(-dt*pressure*35));
   if(amount<1e-8)continue;
   tile.delta[index]=clamp(old-amount,low,high);tile.compaction[index]=clamp(tile.compaction[index]+amount*5,0,1);
   removed+=amount;this.mark(ix,iz);
  }
  this.berm(x,z,removed,demand,dir);
  return removed;
 }
 // A wheel between prev and hit: one capsule, so the trench is continuous even
 // at 60 km/h. The CPU path mirrors the GPU SWEEP op.
 stampSweep(prev,hit,load,demand,dt,dir=null,sinkage){
  const soil=this.profile,low=-soil.maxDepth,high=soil.maxLift;
  const pressure=clamp(load/1000,0,2),target=sinkage>0?Math.min(sinkage,soil.maxDepth):soil.settle+soil.dig*clamp(demand,0,1);
  if(pressure<=0)return 0;
  const rate=1-Math.exp(-dt*pressure*35),ax=prev.x,az=prev.z,bx=hit.x,bz=hit.z;
  const abx=bx-ax,abz=bz-az,length2=Math.max(abx*abx+abz*abz,1e-8);let removed=0;
  for(let ix=Math.floor((Math.min(ax,bx)-.4)/.25);ix<=Math.ceil((Math.max(ax,bx)+.4)/.25);ix++)for(let iz=Math.floor((Math.min(az,bz)-.4)/.25);iz<=Math.ceil((Math.max(az,bz)+.4)/.25);iz++){
   const t=clamp(((ix*.25-ax)*abx+(iz*.25-az)*abz)/length2,0,1),r=Math.hypot(ix*.25-ax-abx*t,iz*.25-az-abz*t)/.4;
   if(r>=1)continue;
   const {tile,index}=this.cell(ix,iz),weight=(1-r*r)**2,old=tile.delta[index],depth=Math.max(0,-old);
   const amount=Math.max(0,target*weight-depth)*rate;if(amount<1e-8)continue;
   tile.delta[index]=clamp(old-amount,low,high);tile.compaction[index]=clamp(tile.compaction[index]+amount*5,0,1);
   removed+=amount;this.mark(ix,iz);
  }
  this.bermSweep(prev,hit,removed,demand);
  return removed;
 }
 // The broad lip makes displacement readable; settling accounts for the rest.
 // sideLip soils push the berm out to both sides of the direction of travel
 // instead of a ring, so the trench ahead is not refilled.
 berm(x,z,removed,demand,dir){
  if(!(removed>0))return;
  const soil=this.profile,low=-soil.maxDepth,high=soil.maxLift,side=soil.sideLip&&dir;
  const ring=[];let weights=0;
  for(let ix=Math.floor((x-.7)/.25);ix<=Math.ceil((x+.7)/.25);ix++)for(let iz=Math.floor((z-.7)/.25);iz<=Math.ceil((z+.7)/.25);iz++){
   const ox=ix*.25-x,oz=iz*.25-z,r=Math.hypot(ox,oz);if(r<.42||r>.7)continue;
   const w=side?2.4*((ox*dir.z-oz*dir.x)/r)**2:1;if(w<.05)continue;ring.push([ix,iz,w]);weights+=w;
  }
  // conserve: every bit dug lands in the berms, less the share thrown as roost.
  const share=soil.conserve?removed*(1-clamp(demand,0,1)*soil.roost)/weights:null;
  for(const [ix,iz,w]of ring){const {tile,index}=this.cell(ix,iz);tile.delta[index]=clamp(tile.delta[index]+(share!==null?share*w:removed*soil.lip*w),low,high);this.mark(ix,iz);}
 }
 // The swept version of the berm: a continuous tube along the wheel path.
 bermSweep(prev,hit,removed,demand){
  if(!(removed>0))return;
  const soil=this.profile,low=-soil.maxDepth,high=soil.maxLift;
  const weights=this.tubeWeights(prev,hit,.42,.7);if(!(weights>0))return;
  const share=soil.conserve?removed*(1-clamp(demand,0,1)*soil.roost)/weights:removed*soil.lip;
  const ax=prev.x,az=prev.z,bx=hit.x,bz=hit.z,abx=bx-ax,abz=bz-az,length2=Math.max(abx*abx+abz*abz,1e-8);
  for(let ix=Math.floor((Math.min(ax,bx)-.7)/.25);ix<=Math.ceil((Math.max(ax,bx)+.7)/.25);ix++)for(let iz=Math.floor((Math.min(az,bz)-.7)/.25);iz<=Math.ceil((Math.max(az,bz)+.7)/.25);iz++){
   const tRaw=((ix*.25-ax)*abx+(iz*.25-az)*abz)/length2;if(tRaw<0||tRaw>1)continue;const t=tRaw,dx=ix*.25-ax-abx*t,dz=iz*.25-az-abz*t,dist=Math.hypot(dx,dz);
   if(dist<.42||dist>.7)continue;
   const side=(dx*abz-dz*abx)/Math.max(dist,1e-4),w=side*side*2.4;if(w<.05)continue;
   const {tile,index}=this.cell(ix,iz);tile.delta[index]=clamp(tile.delta[index]+share*w,low,high);this.mark(ix,iz);
  }
 }
 tubeWeights(prev,hit,rin,rout){
  const ax=prev.x,az=prev.z,bx=hit.x,bz=hit.z,abx=bx-ax,abz=bz-az,length2=Math.max(abx*abx+abz*abz,1e-8);let sum=0;
  for(let ix=Math.floor((Math.min(ax,bx)-rout)/.25);ix<=Math.ceil((Math.max(ax,bx)+rout)/.25);ix++)for(let iz=Math.floor((Math.min(az,bz)-rout)/.25);iz<=Math.ceil((Math.max(az,bz)+rout)/.25);iz++){
   const tRaw=((ix*.25-ax)*abx+(iz*.25-az)*abz)/length2;if(tRaw<0||tRaw>1)continue;const t=tRaw,dx=ix*.25-ax-abx*t,dz=iz*.25-az-abz*t,dist=Math.hypot(dx,dz);
   if(dist<rin||dist>rout)continue;const side=(dx*abz-dz*abx)/Math.max(dist,1e-4),w=side*side*2.4;if(w>=.05)sum+=w;
  }
  return sum;
 }
 // Roost: a share of the sand dug by the driven tire lands in a soft mound
 // behind it, along the direction of travel.
 throwRoost(x,z,dx,dz,amount){
  const soil=this.profile,length=Math.hypot(dx,dz);if(!(amount>0)||length<1e-6)return;
  const cx=x-dx/length*1.15,cz=z-dz/length*1.15,mass=amount*soil.roost;let weightSum=0;const cells=[];
  for(let ix=Math.floor((cx-.5)/.25);ix<=Math.ceil((cx+.5)/.25);ix++)for(let iz=Math.floor((cz-.5)/.25);iz<=Math.ceil((cz+.5)/.25);iz++){
   const r=Math.hypot(ix*.25-cx,iz*.25-cz)/.5;if(r>=1)continue;const w=(1-r*r)**2;weightSum+=w;cells.push([ix,iz,w]);
  }
  for(const [ix,iz,w] of cells){const {tile,index}=this.cell(ix,iz);tile.delta[index]=clamp(tile.delta[index]+mass*w/weightSum,-soil.maxDepth,soil.maxLift);this.mark(ix,iz);}
 }
 // Sand landing from the air (clods, spray) rebuilds a soft mound.
 deposit(x,z,volume,radius=.35){
  const soil=this.profile;if(!(volume>0))return;let sum=0;const cells=[];
  for(let ix=Math.floor((x-radius)/.25);ix<=Math.ceil((x+radius)/.25);ix++)for(let iz=Math.floor((z-radius)/.25);iz<=Math.ceil((z+radius)/.25);iz++){const r=Math.hypot(ix*.25-x,iz*.25-z)/radius;if(r>=1)continue;const w=(1-r*r)**2;sum+=w;cells.push([ix,iz,w]);}
  for(const [ix,iz,w] of cells){const {tile,index}=this.cell(ix,iz);tile.delta[index]=clamp(tile.delta[index]+volume/.0625*w/sum,-soil.maxDepth,soil.maxLift);tile.compaction[index]*=.5;this.mark(ix,iz);}
 }
 // A sliding chassis or tumbling rider ploughs a crater and bulldozes the
 // sand ahead of it. Returns the volume dug (m³) and records a spray event.
 gouge(x,z,vx,vz,dt){
  const soil=this.profile,speed=Math.hypot(vx,vz);if(!(soil.gouge>0)||speed<.8)return 0;
  const low=-soil.maxDepth,target=Math.min(soil.maxDepth,soil.gouge*(.05+.025*Math.min(speed,8)));let removed=0;
  for(let ix=Math.floor((x-.45)/.25);ix<=Math.ceil((x+.45)/.25);ix++)for(let iz=Math.floor((z-.45)/.25);iz<=Math.ceil((z+.45)/.25);iz++){
   const r=Math.hypot(ix*.25-x,iz*.25-z)/.45;if(r>=1)continue;
   const {tile,index}=this.cell(ix,iz),old=tile.delta[index],goal=-target*(1-r*r);if(old<=goal)continue;
   const amount=(old-goal)*(1-Math.exp(-dt*speed*6));tile.delta[index]=clamp(old-amount,low,soil.maxLift);tile.compaction[index]*=.3;removed+=amount*.0625;this.mark(ix,iz);
  }
  if(removed>0){this.deposit(x+vx/speed*.75,z+vz/speed*.75,removed*.55,.55);this.events.push({x,z,vx,vz,amount:removed*.45});if(this.events.length>64)this.events.shift();}
  return removed;
 }
 // Angle-of-repose slumping. Only the rider-made displacement is relaxed, so
 // steep authored terrain (slip faces, canyon walls) never starts flowing.
 // Transfers are pairwise and volume conserving within the soil bounds.
 slump(passes=2){
  const soil=this.profile;if(!(soil.repose>0)||!this.changed.size)return;
  const limit=Math.tan(soil.repose*Math.PI/180)*.25,low=-soil.maxDepth,high=soil.maxLift;
  const get=(ix,iz)=>{const tile=this.soil.get(key(Math.floor(ix/64),Math.floor(iz/64)));return tile?.delta[(iz-Math.floor(iz/64)*64)*64+ix-Math.floor(ix/64)*64]??0;};
  for(let pass=0;pass<passes;pass++){
   const cells=[...this.changed.values()];
   for(const [ix,iz] of cells)for(const [nx,nz] of [[ix+1,iz],[ix-1,iz],[ix,iz+1],[ix,iz-1]]){
    const a=get(ix,iz),b=get(nx,nz),diff=a-b;if(Math.abs(diff)<=limit)continue;
    const [hx,hz,lx,lz]=diff>0?[ix,iz,nx,nz]:[nx,nz,ix,iz],hi=Math.max(a,b),lo=Math.min(a,b);
    const move=Math.min((Math.abs(diff)-limit)*.5,hi-low,high-lo);if(move<1e-7)continue;
    const h=this.cell(hx,hz),l=this.cell(lx,lz);h.tile.delta[h.index]-=move;l.tile.delta[l.index]+=move;
    // Fresh slumped sand is loose again.
    l.tile.compaction[l.index]*=.85;this.mark(hx,hz);this.mark(lx,lz);
   }
  }
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
  this.slump();
  while(this.soil.size>this.maxStoredTiles){
   const oldest=this.soil.keys().next().value;this.soil.delete(oldest);
   const [tx,tz]=oldest.split(',').map(Number);
   for(const dx of [-1,0])for(const dz of [-1,0])this.dirty.add(key(tx+dx,tz+dz));
  }
  this.refresh();
 }
 follow(x,z){
  const tx=Math.floor(x/16),tz=Math.floor(z/16),center=key(tx,tz);if(center===this.center)return;
  this.center=center;const wanted=new Set();
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)wanted.add(key(tx+dx,tz+dz));
  for(const id of this.tiles.keys())if(!wanted.has(id))this.tiles.delete(id);
  for(const id of wanted)if(!this.tiles.has(id)){
   const [a,b]=id.split(',').map(Number),data=Array.from({length:65},(_,i)=>Array.from({length:65},(_,j)=>this.node(a*64+i,(b+1)*64-j)));
   this.tiles.set(id,{key:id,x:a*16,z:(b+1)*16,data,revision:++this.version});
  }
  this.bounds={minX:(tx-1)*16,maxX:(tx+2)*16,minZ:(tz-1)*16,maxZ:(tz+2)*16};this.version++;
 }
 refresh(){
  const touched=new Set();
  if(this.onCells&&this.changed.size)this.onCells([...this.changed.values()],this);
  for(const [ix,iz] of this.changed.values()){
   const tx=Math.floor(ix/64),tz=Math.floor(iz/64),height=this.node(ix,iz);
   const xs=ix%64===0?[tx-1,tx]:[tx],zs=iz%64===0?[tz-1,tz]:[tz];
   for(const x of xs)for(const z of zs){
    const tile=this.tiles.get(key(x,z));if(!tile)continue;
    tile.data[ix-x*64][(z+1)*64-iz]=height;touched.add(tile);
   }
  }
  // Full refresh is only needed on rare cache eviction, never for ordinary ruts.
  for(const id of this.dirty){
   this.baseCache.delete(id);
   const tile=this.tiles.get(id);if(!tile)continue;
   for(let i=0;i<=64;i++)for(let j=0;j<=64;j++)tile.data[i][j]=this.node(tile.x/.25+i,tile.z/.25-j);
   touched.add(tile);
  }
  for(const tile of touched)tile.revision=++this.version;
  this.changed.clear();this.dirty.clear();
 }
 resetContacts(){this.previous=[null,null];}
}
