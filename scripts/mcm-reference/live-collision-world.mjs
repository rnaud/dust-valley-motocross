import {checkpointMemory,loadLiveVisuals} from './live-checkpoint.mjs';
export function loadLiveCollisionWorld(checkpoint,observation){
 if(observation?.schemaVersion!==1||observation.kind!=='mcm-collision-world-observation'||!['player-frame-entry','collision-before-primary'].includes(observation.captureBoundary)||checkpoint.captureBoundary!==observation.captureBoundary||!observation.captureId||observation.captureId!==checkpoint.captureId||observation.bikeAddress!==checkpoint.bikeAddress||observation.playerFrame!==checkpoint.playerFrame)throw Error('Collision world capture boundary differs');
 const local=checkpointMemory(checkpoint);
 const memory=checkpointMemory({...observation,kind:'mcm-partial-local-checkpoint'}),manager=observation.managerAddress,u=a=>memory.u32(a),f=a=>memory.f32(a),vector=(a,n)=>Array.from({length:n},(_,i)=>f(a+i*4));
 for(const a of checkpoint.blocks)for(const b of observation.blocks){
  const start=Math.max(a.address,b.address),end=Math.min(a.address+a.size,b.address+b.size);
  if(start<end&&!local.read(start,end-start).equals(memory.read(start,end-start)))throw Error('Overlapping collision checkpoint bytes differ');
 }
 memory.read(manager,0x394c);const count=u(manager+4),dimension=u(manager+0x3940),cellsAddress=u(manager+0x3948);
 if(count<1||count>60||dimension<1||dimension>128)throw Error('Invalid collision world dimensions');
 const nodes=new Map(),objects=[],actors=new Map(),used=new Set([manager,cellsAddress,0x4e3754]);
 const node=(address,sentinel=false)=>{if(nodes.has(address))throw Error('Overlapping collision nodes');const n={token:address,sentinel,previousAddress:u(address),nextAddress:u(address+4),owner:u(address+8),cell:u(address+12),other:u(address+16),active:u(address+20)};nodes.set(address,n);return n;};
 memory.read(cellsAddress,(dimension*dimension+1)*24);
 const cells=Array.from({length:dimension*dimension+1},(_,i)=>node(cellsAddress+i*24,true));
 for(let id=0;id<count;id++){
  const address=u(manager+8+id*4);memory.read(address,0x110);used.add(address);
  const type=u(address+0xf4),n=u(address+0x90),entriesAddress=u(address+0x8c);
  if(u(address)!==id||u(address+0x98)!==manager||![0,1].includes(type)||n!==4||!entriesAddress)throw Error('Unsupported live collision object');
  memory.read(entriesAddress,n*24);used.add(entriesAddress);
  const entries=Array.from({length:n},(_,i)=>node(entriesAddress+i*24));
  if(entries.some(e=>e.owner!==id||e.active>1))throw Error('Collision entry ownership differs');
  objects.push({address,enabled:u(address+0xc8),extents:vector(address+0x64,3),collisionClass:u(address+0x104),callbackAddresses:[u(address+0x108),u(address+0x10c)],otherAddress:u(address+0x88),contactCC:vector(address+0xcc,3),contactD8:vector(address+0xd8,3),contactE4:vector(address+0xe4,3),ownerAddress:u(address+0x94),entriesAddress,owner:id,type,matrix:vector(address+0x1c,16),localCenter:vector(address+0x70,3),worldCenter:vector(address+0x7c,3),radius:f(address+0x5c),entries});
 }
 if(observation.actorsCaptured){
  for(const object of objects){
   const address=object.ownerAddress,vtable=u(address),kind=vtable===0x4d9a94?'bike':vtable===0x4d6404?'rider':null;
   if(!kind||object.collisionClass!==(kind==='bike'?0:1))throw Error('Unsupported collision actor class');
   memory.read(address,kind==='bike'?0xcc8:0x3ac);used.add(address);
   if(!actors.has(address))actors.set(address,{address,kind,collision:object,
    ...(kind==='bike'?{riderAddress:u(address+0x874),position:vector(address+0x4f8,3),velocity:vector(address+0x510,3),angularVelocity:vector(address+0x534,3),worldAngularVelocity:vector(address+0x528,3),state844:u(address+0x844),inverseMass:f(address+0x55c),inverseInertia:vector(address+0x5f0,3),alternateInertia:vector(address+0x5fc,3),riderInertia:vector(address+0x608,3),alternateMass:f(address+0x678),riderMass:f(address+0x67c),transformAddress:u(address+0x434),proxyAddress:u(address+0xc8c)}:
    {bikeAddress:u(address+0x15c),position:vector(address+0x40,3),alternateVelocity:vector(address+0x70,3),alternateAngular:vector(address+0x7c,3),velocity:vector(address+0x58,3),angular:vector(address+0x64,3),flag13c:u(address+0x13c),flag140:u(address+0x140)})});
   if(u(address+(kind==='bike'?0xc88:0x34))!==object.address)throw Error('Collision actor back-reference differs');
  }
  for(const a of actors.values())if(a.kind==='rider'){
   a.bike=actors.get(a.bikeAddress);if(a.bike?.kind!=='bike'||a.bike.riderAddress!==a.address)throw Error('Collision rider owner missing');a.bike.rider=a;
  }
 }
 const transformNodes=new Map();
 if(observation.transformsCaptured){
  if(!observation.actorsCaptured)throw Error('Actor transforms require captured actors');
  for(const actor of actors.values())if(actor.kind==='bike'){
   const visual=loadLiveVisuals({...observation,kind:'mcm-partial-local-checkpoint',bikeAddress:actor.address},{nodes:transformNodes});
   actor.transform=visual.bike.bodyNode;actor.riderTransform=visual.rider.bodyNode;actor.proxy=visual.rider;
   used.add(actor.proxyAddress);used.add(u(actor.address+0x234));used.add(u(actor.proxyAddress+0x234));
  }
  for(const address of transformNodes.keys())used.add(address);
 }
 if(observation.notificationGatesCaptured){
  if(!observation.actorsCaptured)throw Error('Notification gates require captured actors');
  for(const actor of actors.values())if(actor.kind==='bike'){
   const owner=u(actor.address+0x41c),notification=u(owner+0x3c),world=u(notification+0x3c),player=u(world+0x1ec);
   used.add(owner+0x3c);used.add(notification+0x3c);used.add(world+0x1ec);
   actor.notification={owner,address:notification,world,player};
  }
 }
 let riderResponse;
 if(observation.riderResponseCaptured){
  if(!observation.actorsCaptured)throw Error('Rider response requires captured actors');
  used.add(0x4e21a4);used.add(0x4ede98);
  riderResponse={coefficients:vector(0x4e21a4,6),zero:vector(0x4ede98,3)};
  for(const actor of actors.values())if(actor.kind==='bike'){
   const owner=u(actor.address+0xc84),event=u(owner+0x44),settings=u(owner+0x48);
   actor.riderEffect={owner,event,settings,disabled:u(settings+0x20),eventKind:u(event+0x1f4)};
   used.add(owner+0x44);used.add(settings+0x20);used.add(event+0x1f4);
  }
 }
 let tag=null;
 if(observation.bikeCallbackGatesCaptured){
  const world=u(0x4e4fb4),address=u(world+0x608);used.add(0x4e4fb4);used.add(world+0x608);
  if(address){const context=u(address+0x3c),player=u(context+0x30),holder=u(address+0x80);used.add(address+0x3c);used.add(context+0x30);used.add(address+0x80);
   const actor=a=>{if(!a)return null;const result=actors.get(a);if(result?.kind!=='bike')throw Error('Uncaptured tag actor');return result;};
   tag={address,player:actor(player),holder:actor(holder)};
  }
 }
 const bikeObject=objects.find(o=>o.address===local.u32(checkpoint.bikeAddress+0xc88)),rider=local.u32(checkpoint.bikeAddress+0x874),riderObject=objects.find(o=>o.address===local.u32(rider+0x34));
 if(bikeObject?.ownerAddress!==checkpoint.bikeAddress||riderObject?.ownerAddress!==rider)throw Error('Player collision object ownership differs');
 for(const n of nodes.values()){
  const resolve=a=>{if(!a)return null;const result=nodes.get(a);if(!result)throw Error('Dangling collision link');return result;};
  n.previous=resolve(n.previousAddress);n.next=resolve(n.nextAddress);
 }
 const reached=new Set();
 for(let i=0;i<cells.length;i++){
  const cell=cells[i];if(cell.previous)throw Error('Collision sentinel has previous link');
  let previous=cell;
  for(let n=cell.next;n;n=n.next){
   if(n.sentinel||reached.has(n)||n.previous!==previous||!n.active||n.cell!==i)throw Error('Inconsistent collision linked list');
   reached.add(n);previous=n;
  }
 }
 for(const object of objects)for(const n of object.entries)if(n.active?!reached.has(n):(n.previous||n.next))throw Error('Orphaned collision entry');
 if(observation.blocks.some(b=>!used.has(b.address))||observation.blocks.length!==used.size)throw Error('Unreferenced collision world block');
 return {memory,manager,objects,nodes,actors,transformNodes,riderResponse,tag,enabled:u(0x4e3754),grid:{dimension,cellSize:f(manager+0x3944),centerX:f(manager+0x3938),centerZ:f(manager+0x393c),cells}};
}
