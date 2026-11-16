import assert from 'node:assert/strict';
// Load the initial hierarchy only. Topology does not imply that every virtual
// update uses generic recursion; custom world/bike methods must be connected.
export function loadLiveActorTree(checkpoint,collision,observation){
 assert.equal(observation.schemaVersion,1);assert.equal(observation.kind,'mcm-actor-tree');
 for(const source of [checkpoint,collision])for(const key of ['captureId','captureBoundary','bikeAddress'])assert.equal(observation[key],source[key]);
 assert.ok(observation.nodes.length>0&&observation.nodes.length<=8192);
 const nodes=new Map(),owners=new Map();
 for(const raw of observation.nodes){
  assert.ok(Number.isInteger(raw.address)&&raw.address>0&&!nodes.has(raw.address),'Duplicate actor');
  const bytes=Buffer.from(raw.hex,'hex');assert.equal(bytes.length,0x30);
  const u=o=>bytes.readUInt32LE(o),ownerAddress=u(0x1c);
  const stateBytes=raw.ownedStateHex===undefined?null:Buffer.from(raw.ownedStateHex,'hex');
  if(stateBytes){assert.equal(stateBytes.length,u(8),'Actor owned size differs');assert.ok(stateBytes.subarray(0,0x30).equals(bytes),'Actor owned header differs');}
  const boundaryWords=raw.boundaryWords;
  if(boundaryWords!==undefined)assert.ok(raw.update===0x439a30&&Array.isArray(boundaryWords)&&boundaryWords.length===2&&boundaryWords.every(v=>Number.isInteger(v)&&v>=0&&v<=0xffffffff),'Invalid impact emitter boundary words');
  const observed=stateBytes??bytes;
  for(const source of [checkpoint,collision])for(const block of source.blocks){
   const start=Math.max(raw.address,block.address),end=Math.min(raw.address+observed.length,block.address+block.size);
   if(start<end)assert.ok(observed.subarray(start-raw.address,end-raw.address).equals(Buffer.from(block.hex,'hex').subarray(start-block.address,end-block.address)),'Actor checkpoint overlap differs');
  }
  if(ownerAddress){
   const value={world:raw.owner,gate:raw.gate,device:raw.device,deviceEnabled:raw.deviceEnabled};
   if(owners.has(ownerAddress))assert.deepEqual(value,owners.get(ownerAddress));else owners.set(ownerAddress,value);
  }else for(const key of ['owner','gate','device','deviceEnabled'])assert.equal(raw[key],0);
  nodes.set(raw.address,{address:raw.address,stateBytes,boundaryWords,vtable:u(0),update:raw.update,destroy:raw.destroy,previousAddress:u(0xc),nextAddress:u(0x10),firstAddress:u(0x14),parentAddress:u(0x18),ownerAddress,enabled:u(0x20),paused:u(0x28),removed:u(0x2c)});
 }
 const resolve=address=>{if(!address)return null;assert.ok(nodes.has(address),'Missing actor link');return nodes.get(address);};
 for(const node of nodes.values())for(const key of ['previous','next','first','parent'])node[key]=resolve(node[key+'Address']);
 const root=resolve(observation.root);assert.ok(root&&!root.parent&&!root.previous&&!root.next,'Invalid actor root');
 const reached=new Set(),order=[];
 function visit(node){assert.ok(!reached.has(node),'Actor cycle or duplicate ownership');reached.add(node);order.push(node.address);let previous=null;
  for(let child=node.first;child;child=child.next){assert.equal(child.parent,node,'Actor parent differs');assert.equal(child.previous,previous,'Actor sibling differs');visit(child);previous=child;}
 }
 visit(root);assert.equal(reached.size,nodes.size,'Unreachable actor');
 const bikeBlock=checkpoint.blocks.find(b=>b.address===checkpoint.bikeAddress);assert.ok(bikeBlock);
 const riderAddress=Buffer.from(bikeBlock.hex,'hex').readUInt32LE(0x874),rider=resolve(riderAddress);
 assert.equal(rider.update,0x40e990);assert.equal(rider.parent?.address,checkpoint.bikeAddress+0x404,'Bike actor subobject differs');
 return {root,nodes,owners,order,rider};
}
