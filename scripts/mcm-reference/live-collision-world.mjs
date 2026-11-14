import {checkpointMemory} from './live-checkpoint.mjs';
export function loadLiveCollisionWorld(checkpoint,observation){
 if(observation?.schemaVersion!==1||observation.kind!=='mcm-collision-world-observation'||observation.captureBoundary!=='player-frame-entry'||checkpoint.captureBoundary!==observation.captureBoundary||!observation.captureId||observation.captureId!==checkpoint.captureId||observation.bikeAddress!==checkpoint.bikeAddress)throw Error('Collision world capture boundary differs');
 const local=checkpointMemory(checkpoint);
 const memory=checkpointMemory({...observation,kind:'mcm-partial-local-checkpoint'}),manager=observation.managerAddress,u=a=>memory.u32(a),f=a=>memory.f32(a),vector=(a,n)=>Array.from({length:n},(_,i)=>f(a+i*4));
 for(const a of checkpoint.blocks)for(const b of observation.blocks){
  const start=Math.max(a.address,b.address),end=Math.min(a.address+a.size,b.address+b.size);
  if(start<end&&!local.read(start,end-start).equals(memory.read(start,end-start)))throw Error('Overlapping collision checkpoint bytes differ');
 }
 memory.read(manager,0x394c);const count=u(manager+4),dimension=u(manager+0x3940),cellsAddress=u(manager+0x3948);
 if(count<1||count>60||dimension<1||dimension>128)throw Error('Invalid collision world dimensions');
 const nodes=new Map(),objects=[],used=new Set([manager,cellsAddress,0x4e3754]);
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
  objects.push({address,ownerAddress:u(address+0x94),entriesAddress,owner:id,type,matrix:vector(address+0x1c,16),localCenter:vector(address+0x70,3),worldCenter:vector(address+0x7c,3),radius:f(address+0x5c),entries});
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
 return {memory,manager,objects,nodes,enabled:u(0x4e3754),grid:{dimension,cellSize:f(manager+0x3944),centerX:f(manager+0x3938),centerZ:f(manager+0x393c),cells}};
}
