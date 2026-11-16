import assert from 'node:assert/strict';
import {tickMcmMarker} from '../../src/physics/mcm/marker-tick.js';
import {rotateMcmTransform} from '../../src/physics/mcm/transform.js';
import {invalidateMcmTransform} from '../../src/physics/mcm/event-orientation.js';
export function connectWorldMarkerRuntime(runtime){
 const markers=new Map();
 for(const actor of runtime.world.tree.nodes.values()){
  if(actor.update!==0x475450||!actor.shapeTransforms)continue;
  const bytes=actor.stateBytes;assert.equal(bytes?.length,0xa4);
  assert.equal(actor.shapeTransformRoot,bytes.readUInt32LE(0x30));
  const nodes=new Map(),rawNodes=new Map();
  assert.ok(actor.shapeTransforms.length>0&&actor.shapeTransforms.length<=8192);
  for(const raw of actor.shapeTransforms){
   assert.ok(Number.isInteger(raw.address)&&raw.address>0&&!nodes.has(raw.address));
   const b=Buffer.from(raw.hex,'hex');assert.equal(b.length,0x114);rawNodes.set(raw.address,b);
   // Shared scene nodes must not silently become detached presentation copies.
   assert.ok(!runtime.ordered.transformNodes.has(raw.address),'Marker graph overlaps retained scene; shared binding required');
   nodes.set(raw.address,{address:raw.address,local:Array.from({length:16},(_,i)=>b.readFloatLE(0x84+i*4)),world:Array.from({length:16},(_,i)=>b.readFloatLE(0xc4+i*4)),cacheValid:b.readUInt32LE(0x104)});
  }
  const resolve=address=>{if(!address)return null;assert.ok(nodes.has(address),'Missing marker transform dependency');return nodes.get(address);};
  for(const [address,node]of nodes){const b=rawNodes.get(address);node.parent=resolve(b.readUInt32LE(0x108));node.firstChild=resolve(b.readUInt32LE(0x10c));node.nextSibling=resolve(b.readUInt32LE(0x110));}
  markers.set(actor.address,{actor,nodes,root:resolve(actor.shapeTransformRoot)});
 }
 return {markers,compare(row){
  const marker=markers.get(row.address);assert.ok(marker,'Unknown marker assertion');assert.equal(row.shape,marker.root.address);
  const expected=Buffer.from(row.hex,'hex'),shape=Buffer.from(row.shapeHex,'hex');assert.equal(expected.length,0xa4);assert.equal(shape.length,0x114);
  const differences=[],cacheDifferences=[];let words=0;
  const check=(target,name,offset,actual,value)=>{words++;if(actual!==value)target.push({name,offset,actual,expected:value});};
  for(let o=0;o<expected.length;o+=4)check(differences,'marker',o,marker.actor.stateBytes.readUInt32LE(o),expected.readUInt32LE(o));
  const bits=x=>new Uint32Array(Float32Array.of(x).buffer)[0];
  for(let i=0;i<16;i++)check(differences,'local',0x84+i*4,bits(marker.root.local[i]),shape.readUInt32LE(0x84+i*4));
  for(let i=0;i<16;i++)check(cacheDifferences,'world',0xc4+i*4,bits(marker.root.world[i]),shape.readUInt32LE(0xc4+i*4));
  check(cacheDifferences,'cache',0x104,marker.root.cacheValid,shape.readUInt32LE(0x104));
  return {words,differences,cacheDifferences};
 },move(address,position){
  const marker=markers.get(address);assert.ok(marker,'Unknown world marker');
  if(marker.actor.stateBytes.readUInt32LE(0x5c))throw Error('Marker collision refresh requires captured collision dependencies');
  marker.root.local.splice(12,3,...position);invalidateMcmTransform(marker.root);
 },step(node,dt,children){
  const marker=markers.get(node.address);
  if(marker){
   const b=node.stateBytes;
   tickMcmMarker(new DataView(b.buffer,b.byteOffset,b.length),dt,{children,rotate:(address,axis,angle)=>{
    assert.equal(address,marker.root.address);marker.root.local=rotateMcmTransform(marker.root.local,axis,angle);invalidateMcmTransform(marker.root);
   }});return true;
  }
  if(node.update===0x446200&&node.stateBytes){node.stateBytes.writeFloatLE(dt,0x114);children();return true;}
  if(node.update===0x43d850&&node.stateBytes?.readUInt32LE(0x34)===0xffffffff){children();return true;}
  return false;
 }};
}
