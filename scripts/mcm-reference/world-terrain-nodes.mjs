import assert from 'node:assert/strict';
import {loadTerrainResources} from './terrain-resources.mjs';
import {createTerrainNodeObservationDecoder} from './terrain-node-observations.mjs';
import {setupMcmTerrainView} from '../../src/physics/mcm/terrain-view-setup.js';
import {traverseMcmTerrain} from '../../src/physics/mcm/terrain-traversal.js';
import {selectMcmTerrainNode} from '../../src/physics/mcm/terrain-node-select.js';
import {updateMcmTerrainNode,resetMcmTerrainDetail} from '../../src/physics/mcm/terrain-node-update.js';
import {propagateMcmTerrainVertex,rebuildMcmTerrainVertices} from '../../src/physics/mcm/terrain-vertex-propagation.js';
import {propagateMcmTerrainBoundary} from '../../src/physics/mcm/terrain-patch-propagation.js';
import {projectMcmBounds} from '../../src/physics/mcm/projected-bounds.js';
import {projectMcmSphere} from '../../src/physics/mcm/projected-sphere.js';

// Diagnostic retained traversal/update state. Emission, release accounting and
// clocks remain unconnected; the terrain scene actor stays in the external list.
export function connectWorldTerrainNodes(runtime,chase){
 assert.ok(chase,'Terrain nodes require retained chase camera');
 const actors=[...runtime.world.tree.nodes.values()].filter(n=>n.update===0x411000);assert.equal(actors.length,1);
 const actor=actors[0],initial=actor.terrainInitial;assert.ok(initial?.nodeSnapshot,'Missing terrain node initialization');assert.equal(initial.camera,chase.address);
 const resources=loadTerrainResources(initial),observations=createTerrainNodeObservationDecoder(initial.nodeSnapshot);
 // These buffers are independent. Only the observation graph receives deltas.
 const nodes=new Map([...observations.nodes].map(([a,b])=>[a,Buffer.from(b)])),tables=new Map(observations.tables);
 const ownerBytes=Buffer.from(initial.hex,'hex'),owner=new DataView(ownerBytes.buffer,ownerBytes.byteOffset,ownerBytes.length);
 const views=new Map([...nodes].map(([a,b])=>[a,new DataView(b.buffer,b.byteOffset,b.length)]));
 const banks=new Map([...resources.banks].map(([a,b])=>[a,new DataView(b.buffer,b.byteOffset,b.length)]));
 const pointers=new Map();for(const[a,b]of tables)for(let i=0;i<256;i++)pointers.set(a+i*4,b.readUInt32LE(i*4));
 let ticks=0,projection;
 const env={...resources,childCount:resources.rowOffsets[16],boundsTests:initial.globals[0],sphereTests:initial.globals[1],
  node(address){assert.ok(views.has(address),'Uncaptured terrain node');return views.get(address);},
  owner(address){assert.equal(address,actor.address);return owner;},
  bank(address){assert.ok(banks.has(address),'Uncaptured terrain bank');return banks.get(address);},
  u32(address){assert.ok(pointers.has(address),'Uncaptured terrain pointer');return pointers.get(address);},
  vertexCoordinates(i){return[resources.metadata.readInt32LE(i*32),resources.metadata.readInt32LE(i*32+4)];},
  vertexMetadata(i){return Array.from({length:8},(_,j)=>resources.metadata.readInt32LE(i*32+j*4));},
  callVirtual(method){assert.equal(method,0x4d9b40,'Unrecovered terrain virtual method');}, // original 4ba1a0: ret 4
  free(address,pointer){throw Error(`Unconnected terrain allocation release: node ${address.toString(16)} pointer ${pointer.toString(16)}`);},
  select(...args){return selectMcmTerrainNode(...args,env);},
  propagate(...args){return propagateMcmTerrainVertex(...args,env);},
  boundary(...args){return propagateMcmTerrainBoundary(...args,env);},
  rebuild(address){return rebuildMcmTerrainVertices(address,env);},
  projectBounds(address,transform,center,extent,wantCount){assert.equal(transform,chase.address+0xb0);const result=projectMcmBounds({matrix:projection,center,extent,wantRect:false,wantCount});return{visible:result.accepted,inside:result.count};},
  projectSphere(address,transform,center,radius){assert.equal(transform,chase.address+0xb0);const state=chase.cameraState,camera=new DataView(new ArrayBuffer(0x254));state.matrices.forEach((v,i)=>camera.setFloat32(0x30+i*4,v,true));camera.setFloat32(0x1a8,state.renderCamera.near,true);camera.setFloat32(0x1ac,state.renderCamera.far,true);return projectMcmSphere({camera,matrix:projection,center,radius:new Float32Array(Uint32Array.of(radius).buffer)[0]}).accepted;},
 };
 return{address:actor.address,get ticks(){return ticks;},step(frame){
  if(!frame)return;const state=chase.cameraState;assert.ok(state?.renderCamera,'Missing retained terrain camera');projection=state.matrices.slice(32,48);
  const mode=owner.getUint32(0x958,true),changed=mode!==owner.getUint32(0x54,true),c=state.renderCamera;
  setupMcmTerrainView(owner,{position:c.values.slice(0,3),fov:c.fov,width:c.width},mode);env.boundsTests=env.sphereTests=0;
  const root=owner.getUint32(0x44,true),node=env.node(root),vec=o=>[0,4,8].map(i=>node.getFloat32(o+i,true));
  traverseMcmTerrain(root,owner.getUint32(0x3c,true),chase.address+0xb0,vec(0x1ec),vec(0x1f8),0,0,16,0,0,env);
  owner.setUint32(0xc0,(owner.getUint32(0xc0,true)+1)>>>0,true);
  (changed?resetMcmTerrainDetail:updateMcmTerrainNode)(owner.getUint32(0x44,true),env);
  assert.equal(owner.getUint32(0x7c,true),0,'Unconnected optional terrain update');ticks++;
 },compare(row){
  if(!row?.nodeSnapshot)return null;resources.assertObservation(row);observations.apply(row.nodeSnapshot);
  const differences=[];for(const[address,expected]of observations.nodes){const actual=nodes.get(address);for(let offset=0;offset<expected.length;offset+=4)if(actual.readUInt32LE(offset)!==expected.readUInt32LE(offset))differences.push({address,offset,actual:actual.readUInt32LE(offset),expected:expected.readUInt32LE(offset)});}
  const updateDifferences=[];
  for(const[address,expected]of observations.nodes){const actual=nodes.get(address);
   for(let offset=0x60;offset<=0x181;offset++)if(actual[offset]!==expected[offset])updateDifferences.push({address,offset,actual:actual[offset],expected:expected[offset]});
   for(const offset of[0x184,0x188,0x18c,0x190,0x194,0x1b0])if(actual.readUInt32LE(offset)!==expected.readUInt32LE(offset))updateDifferences.push({address,offset,actual:actual.readUInt32LE(offset),expected:expected.readUInt32LE(offset)});
  }
  const expectedOwner=Buffer.from(row.hex,'hex'),ownerOffsets=[0x48,0x4c,0x50,0x54,0x58,0x5c,0x60,0x64,0x68,0x88,0x90,0x9c,0xa0,0xa8,0xac,0xb0,0xc0,...Array.from({length:290},(_,i)=>0xc4+i*4)];
  const ownerDifferences=ownerOffsets.filter(o=>ownerBytes.readUInt32LE(o)!==expectedOwner.readUInt32LE(o)).map(offset=>({offset,actual:ownerBytes.readUInt32LE(offset),expected:expectedOwner.readUInt32LE(offset)}));
  const globalDifferences=[env.boundsTests,env.sphereTests].flatMap((actual,i)=>actual===row.globals[i]?[]:[{index:i,actual,expected:row.globals[i]}]);
  return{sequence:observations.sequence,words:nodes.size*0x210/4,differences,updateBytes:nodes.size*(290+24),updateDifferences,ownerWords:ownerOffsets.length,ownerDifferences,globalDifferences};
 }};
}
