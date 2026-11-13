// Addressed reads from an explicitly partial original-memory capture. Missing
// dependencies fail rather than becoming zero-filled or synthetic state.
export function checkpointMemory(checkpoint){
 if(checkpoint?.schemaVersion!==1||checkpoint.kind!=='mcm-partial-local-checkpoint'||checkpoint.blockCount!==checkpoint.blocks?.length)throw Error('Invalid partial checkpoint');
 const blocks=checkpoint.blocks.map(b=>{
  if(!Number.isInteger(b.address)||b.address<=0||!Number.isInteger(b.size)||b.size<=0||b.address+b.size>0x100000000||typeof b.hex!=='string'||b.hex.length!==b.size*2||!/^[0-9a-f]+$/i.test(b.hex))throw Error('Invalid checkpoint block');
  return {...b,bytes:Buffer.from(b.hex,'hex')};
 }).sort((a,b)=>a.address-b.address);
 for(let i=1;i<blocks.length;i++)if(blocks[i].address<blocks[i-1].address+blocks[i-1].size)throw Error('Overlapping checkpoint blocks');
 const read=(address,size)=>{
  if(!Number.isInteger(address)||!Number.isInteger(size)||size<1)throw Error('Invalid memory read');
  const block=blocks.find(b=>address>=b.address&&address+size<=b.address+b.size);
  if(!block)throw Error(`Missing checkpoint memory at 0x${address.toString(16)} (${size} bytes)`);
  return Buffer.from(block.bytes.subarray(address-block.address,address-block.address+size));
 };
 return {read,u32:a=>read(a,4).readUInt32LE(),f32:a=>read(a,4).readFloatLE()};
}

// Original engine allocation and analog filter; no profile constants are
// substituted. The CRT stream is supplied separately by the capture protocol.
export function loadLiveEngine(checkpoint){
 const m=checkpointMemory(checkpoint),bike=checkpoint.bikeAddress;
 if(m.u32(bike)!==0x4d9a94)throw Error('Unsupported bike vtable');
 const address=m.u32(bike+0x8f0);m.read(address,0x1f0);
 if(m.u32(address)!==bike)throw Error('Engine owner differs from checkpoint bike');
 const f=o=>m.f32(address+o),u=o=>m.u32(address+o),gearCount=u(0x84);
 if(gearCount<1||gearCount>5)throw Error('Unsupported captured gear count');
 const array=(offset,stride=4)=>Array.from({length:gearCount},(_,i)=>f(offset+i*stride));
 const filterAddress=u(4);
 return {address,engine:{gearCount,ratios:array(8),thresholdBases:array(0x20,8),thresholdRanges:array(0x50),speedThresholds:array(0x64),
  downshiftRpm:f(0x78),previousRpmDemand:f(0x7c),shiftDuration:f(0x80),maxRpm:u(0x148),topGearLimitDisabled:!!u(0x14c),
  released:u(0x150),shiftThreshold:f(0x154),gear:u(0x158),rpmDemand:f(0x15c),state:f(0x160),shiftTimer:f(0x168),
  analogFilter:{value:m.f32(filterAddress),duration:m.f32(filterAddress+4)},randomScale:1/32768},memory:m};
}

// Original 0x3ac-byte rider controller, allocated at 0x4a3a6b. Six
// 0x5c-byte event records contain capacities 5, 5 and 10, not three equal
// five-entry groups. Resource addresses are retained; assets are not invented.
export function loadLiveRider(checkpoint){
 const memory=checkpointMemory(checkpoint),bike=checkpoint.bikeAddress;
 if(memory.u32(bike)!==0x4d9a94)throw Error('Unsupported bike vtable');
 const address=memory.u32(bike+0x874),bytes=memory.read(address,0x3ac);
 const u=o=>bytes.readUInt32LE(o),i=o=>bytes.readInt32LE(o),f=o=>bytes.readFloatLE(o),vec=o=>[f(o),f(o+4),f(o+8)];
 if(u(0x15c)!==bike)throw Error('Rider owner differs from checkpoint bike');
 const records=Array.from({length:6},(_,kind)=>[0,0x18,0x30].map((offset,group)=>{
  const start=0x174+kind*0x5c+offset,count=u(start),capacity=[5,5,10][group];
  if(count>capacity)throw Error('Rider event count exceeds captured allocation');
  return Array.from({length:count},(_,j)=>u(start+4+j*4));
 }));
 const rider={previousVelocity:vec(0x58),velocity:vec(0x70),angularVelocity:vec(0x7c),
  fieldf8:f(0xf8),field138:u(0x138),flag13c:u(0x13c),field140:u(0x140),field144:u(0x144),field154:i(0x154),
  selected:[u(0x160),u(0x164),u(0x168)],active16c:u(0x16c),kind:i(0x170),visualPresent:!!u(0x34)};
 return {address,rider,records,visualAddress:u(0x34),
  unresolvedAnimationRecords:[...new Set([...records.flat(2),...rider.selected].filter(Boolean))]};
}

// Shared object/scene layout used by original animation callbacks. Cache state
// and graph identity are loaded as captured; no transform is recomputed here.
export function loadLiveVisuals(checkpoint){
 const memory=checkpointMemory(checkpoint),nodes=new Map();
 const loadNode=address=>{
  if(!address)return null;
  if(nodes.has(address))return nodes.get(address);
  if(nodes.size>=256)throw Error('Transform graph exceeds checkpoint limit');
  const bytes=memory.read(address,0x114),u=o=>bytes.readUInt32LE(o);
  const matrix=o=>Array.from({length:16},(_,i)=>bytes.readFloatLE(o+i*4));
  const node={address,local:matrix(0x84),world:matrix(0xc4),cacheValid:u(0x104)};nodes.set(address,node);
  node.parent=loadNode(u(0x108));node.firstChild=loadNode(u(0x10c));node.nextSibling=loadNode(u(0x110));
  return node;
 };
 const loadObject=(address,vtable)=>{
  if(memory.u32(address)!==vtable)throw Error('Unsupported visual object vtable');
  const count=memory.u32(address+0x230),table=memory.u32(address+0x234);
  if(count<1||count>32)throw Error('Unsupported component count');
  memory.read(table,count*0x40);
  const bodyNode=loadNode(memory.u32(address+0x434));if(!bodyNode)throw Error('Missing visual root');
  const components=Array.from({length:count},(_,i)=>{
   const node=loadNode(memory.u32(table+i*0x40+0x34));if(!node)throw Error('Missing component transform');
   return {node,positionEnabled:memory.u32(table+i*0x40+0x38)};
  });
  return {address,bodyNode,components};
 };
 const bike=loadObject(checkpoint.bikeAddress,0x4d9a94),rider=loadObject(memory.u32(checkpoint.bikeAddress+0xc8c),0x4d7b14);
 for(const node of nodes.values()){
  const ancestors=new Set();for(let n=node;n;n=n.parent){if(ancestors.has(n))throw Error('Cyclic transform parent chain');ancestors.add(n);}
 }
 for(const node of nodes.values()){
  const chain=new Set();for(let sibling=node;sibling;sibling=sibling.nextSibling){if(chain.has(sibling))throw Error('Cyclic transform sibling chain');chain.add(sibling);if(sibling.parent!==node.parent)throw Error('Transform sibling parent mismatch');}
  const siblings=new Set();for(let child=node.firstChild;child;child=child.nextSibling){
   if(siblings.has(child))throw Error('Cyclic transform sibling chain');siblings.add(child);
   if(child.parent!==node)throw Error('Transform parent/child mismatch');
  }
  if(node.parent){let found=false;const peers=new Set();for(let child=node.parent.firstChild;child;child=child.nextSibling){if(peers.has(child))throw Error('Cyclic transform sibling chain');peers.add(child);if(child===node)found=true;}if(!found)throw Error('Unlinked transform parent');}
 }
 return {bike,rider,nodes};
}
