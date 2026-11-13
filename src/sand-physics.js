import {Body,Heightfield} from 'cannon-es';

// Bounded deterministic soil approximation, separate from MCM parity. Wheel load
// settles the bed; drive demand deepens ruts. Not a granular or wheel-slip solver.
export const SAND_SPACING=.25,SAND_SEGMENTS=64,SAND_TILE_SIZE=16;
const key=(x,z)=>`${x},${z}`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class SandSurface {
 constructor(baseHeight,{maxStoredTiles=128}={}){
  this.baseHeight=baseHeight;this.maxStoredTiles=Math.max(16,maxStoredTiles);
  this.soil=new Map();this.tiles=new Map();this.version=0;this.bounds=null;
  this.previous=[null,null];this.dirty=new Set();this.changed=new Map();this.center='';
 }
 node(ix,iz){
  const tx=Math.floor(ix/64),tz=Math.floor(iz/64),tile=this.soil.get(key(tx,tz));
  return this.baseHeight(ix*.25,iz*.25)+(tile?.delta[(iz-tz*64)*64+ix-tx*64]??0);
 }
 displacementAt(x,z){return this.sample(x,z,(ix,iz)=>this.node(ix,iz)-this.baseHeight(ix*.25,iz*.25));}
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
 stamp(x,z,load,demand,dt){
  const pressure=clamp(load/1000,0,2),target=.045+.075*clamp(demand,0,1);
  if(pressure<=0)return;
  let removed=0;
  for(let ix=Math.floor((x-.4)/.25);ix<=Math.ceil((x+.4)/.25);ix++)for(let iz=Math.floor((z-.4)/.25);iz<=Math.ceil((z+.4)/.25);iz++){
   const r=Math.hypot(ix*.25-x,iz*.25-z)/.4;if(r>=1)continue;
   const {tile,index}=this.cell(ix,iz),weight=(1-r*r)**2,old=tile.delta[index],depth=Math.max(0,-old);
   // Settle within a rolling tire's short contact time; slow settling hid ruts at riding speed.
   const amount=Math.max(0,target*weight-depth)*(1-Math.exp(-dt*pressure*35));
   if(amount<1e-8)continue;
   tile.delta[index]=clamp(old-amount,-.14,.045);tile.compaction[index]=clamp(tile.compaction[index]+amount*5,0,1);
   removed+=amount;this.mark(ix,iz);
  }
  // A broad lip makes displacement readable; settling accounts for the remainder.
  // This bounded approximation does not claim volume conservation.
  if(removed>0)for(let ix=Math.floor((x-.7)/.25);ix<=Math.ceil((x+.7)/.25);ix++)for(let iz=Math.floor((z-.7)/.25);iz<=Math.ceil((z+.7)/.25);iz++){
   const r=Math.hypot(ix*.25-x,iz*.25-z);if(r<.42||r>.7)continue;
   const {tile,index}=this.cell(ix,iz);tile.delta[index]=clamp(tile.delta[index]+removed*.012,-.14,.045);this.mark(ix,iz);
  }
 }
 deform(contacts,dt){
  for(let i=0;i<2;i++){
   const hit=contacts[i],prev=this.previous[i];
   if(!hit||hit.load<=0){this.previous[i]=null;continue;}
   const distance=prev?Math.hypot(hit.x-prev.x,hit.z-prev.z):0;
   // Bridge fast travel, but never draw across recovery teleports.
   const steps=distance<=4?Math.max(1,Math.ceil(distance/.125)):1;
   for(let n=1;n<=steps;n++){
    const t=n/steps,x=steps>1?prev.x+(hit.x-prev.x)*t:hit.x,z=steps>1?prev.z+(hit.z-prev.z)*t:hit.z;
    this.stamp(x,z,hit.load,hit.demand??0,dt/steps);
   }
   this.previous[i]={x:hit.x,z:hit.z};
  }
  while(this.soil.size>this.maxStoredTiles){
   const oldest=this.soil.keys().next().value;this.soil.delete(oldest);
   const [tx,tz]=oldest.split(',').map(Number);
   for(const dx of [-1,0])for(const dz of [-1,0])this.dirty.add(key(tx+dx,tz+dz));
  }
  this.refresh();
 }
 follow(x,z,world){
  const tx=Math.floor(x/16),tz=Math.floor(z/16),center=key(tx,tz);if(center===this.center)return;
  this.center=center;const wanted=new Set();
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)wanted.add(key(tx+dx,tz+dz));
  for(const [id,tile] of this.tiles)if(!wanted.has(id)){world.removeBody(tile.body);this.tiles.delete(id);}
  for(const id of wanted)if(!this.tiles.has(id)){
   const [a,b]=id.split(',').map(Number),data=Array.from({length:65},(_,i)=>Array.from({length:65},(_,j)=>this.node(a*64+i,(b+1)*64-j)));
   const shape=new Heightfield(data,{elementSize:.25}),body=new Body({mass:0});body.sandSurface=this;
   body.addShape(shape);body.quaternion.setFromEuler(-Math.PI/2,0,0);body.position.set(a*16,0,(b+1)*16);world.addBody(body);
   this.tiles.set(id,{key:id,x:a*16,z:(b+1)*16,data,shape,body,revision:++this.version});
  }
  this.bounds={minX:(tx-1)*16,maxX:(tx+2)*16,minZ:(tz-1)*16,maxZ:(tz+2)*16};this.version++;
 }
 refresh(){
  const touched=new Set();
  for(const [ix,iz] of this.changed.values()){
   const tx=Math.floor(ix/64),tz=Math.floor(iz/64),height=this.node(ix,iz);
   const xs=ix%64===0?[tx-1,tx]:[tx],zs=iz%64===0?[tz-1,tz]:[tz];
   for(const x of xs)for(const z of zs){
    const tile=this.tiles.get(key(x,z));if(!tile)continue;
    tile.shape.setHeightValueAtIndex(ix-x*64,(z+1)*64-iz,height);touched.add(tile);
   }
  }
  // Full refresh is only needed on rare cache eviction, never for ordinary ruts.
  for(const id of this.dirty){
   const tile=this.tiles.get(id);if(!tile)continue;
   for(let i=0;i<=64;i++)for(let j=0;j<=64;j++)tile.data[i][j]=this.node(tile.x/.25+i,tile.z/.25-j);
   tile.shape.update();touched.add(tile);
  }
  for(const tile of touched){
   tile.shape.updateMinValue();tile.shape.updateMaxValue();tile.shape.updateBoundingSphereRadius();
   tile.body.updateBoundingRadius();tile.body.aabbNeedsUpdate=true;tile.revision=++this.version;
  }
  this.changed.clear();this.dirty.clear();
 }
 resetContacts(){this.previous=[null,null];}
}
