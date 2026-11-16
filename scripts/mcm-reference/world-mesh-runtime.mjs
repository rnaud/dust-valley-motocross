import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
import assert from '../../src/physics/mcm/captured-invariants.js';
import {drawMcmRetainedMesh} from '../../src/physics/mcm/retained-mesh-draw.js';
// Mesh resources and mutable LOD state are initialized only at world entry.
// Subsequent calls accept camera/viewport inputs, never observed mesh outputs.
export function connectWorldMeshes(files,world,bikes){
 const actors=new Map(),lodNodes=new Map();
 for(let i=0;i<world.bikes.length;i++){
  const text=files[`world-mesh-${i}.jsonl`];if(!text)throw Error('Missing initial world mesh resources');
  const rows=text.trim().split('\n').map(JSON.parse),bike=bikes.get(world.bikes[i].address),{loaded}=bike;
  assert.equal(rows.length,2);
  for(const [j,row]of rows.entries()){
   assert.equal(row.captureBoundary,'world-frame-entry');assert.equal(row.captureId,world.entry.captureId);
   const kind=j?'rider':'bike',visual=loaded.visuals[kind];assert.equal(row.actor,visual.address);assert.equal(row.node,visual.bodyNode.address);
   for(const n of row.lodNodes){const state={levels:n.levels|0,index:n.index|0};if(lodNodes.has(n.address))assert.deepEqual(lodNodes.get(n.address),state);else lodNodes.set(n.address,state);}
   const blocks=new Map(row.blocks.map(b=>[b.address,CapturedBytes.from(b.hex,'hex')])),mesh=blocks.get(row.node),table=blocks.get(row.table);
   assert.equal(mesh.length,0x238);assert.equal(mesh.readUInt32LE(0x234),row.table);assert.equal(table.length,row.levels*8);
   const groups=Array.from({length:row.levels},(_,level)=>{
    const count=table.readUInt32LE(level*8),groups=blocks.get(table.readUInt32LE(level*8+4));assert.equal(groups.length,count*40);
    return Array.from({length:count},(_,g)=>{const n=groups.readInt32LE(g*40),entries=blocks.get(groups.readUInt32LE(g*40+4));assert.ok(n>=0);assert.equal(entries.length,n*20);
     return Array.from({length:n},(_,k)=>{const address=entries.readUInt32LE(k*20),count=entries.readUInt32LE(k*20+4),node=loaded.visuals.nodes.get(address);if(count)assert.ok(node,'Missing initial mesh component');return {node,count};});
    });
   });
   const state={actor:row.actor,kind,bike,node:visual.bodyNode,animation:loaded.context.frameRider[kind+'Animation'],camera:row.camera,viewport:row.viewport.slice(),projection:Array.from(new Float32Array(Uint32Array.from(row.projection).buffer)),rendererMode:row.rendererMode,
    mesh:{hidden:mesh.readUInt32LE(0x12c),needsUpdate:mesh.readUInt32LE(0x180),dispatchReady:mesh.readUInt32LE(0x18c),buffersReady:mesh.readUInt32LE(0x190),groups,lodNodes},
    selection:{index:row.selection|0,enabled:row.enabled,thresholds:row.thresholds.map(v=>v|0)},rect:row.rect.map(v=>v|0)};
   actors.set(row.actor,state);
  }
 }
 return {actors,lodNodes,draw(address,{projection,viewport,rendererMode}={}){
  const s=actors.get(address);if(!s)throw Error('Unknown initialized mesh actor');
  const result=drawMcmRetainedMesh({node:s.node,center:s.animation.boundsMin,extent:s.animation.boundsMax,projection:projection??s.projection,viewport:viewport??s.viewport,rendererMode:rendererMode??s.rendererMode,mesh:s.mesh,selection:s.selection});
  s.rect=result.rect;
  if(s.kind==='bike')s.bike.projection.storeRenderState(result.rect,s.selection.index);
  return result;
 }};
}
