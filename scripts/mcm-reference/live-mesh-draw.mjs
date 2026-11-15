import assert from 'node:assert/strict';
import {floatBits} from '../../src/physics/mcm/math.js';
import {drawMcmRetainedMesh} from '../../src/physics/mcm/retained-mesh-draw.js';
const floats=words=>new Float32Array(Uint32Array.from(words).buffer);

// One mesh-table initialization per actor. Later native geometry, tables,
// rectangles, caches and resolver targets are assertions only.
export function connectLiveMeshDraw(runtime,initialRow){
 const {loaded}=runtime,actors=new Map(),lodNodes=new Map(),pending=[],queries=[],reports=[];
 let nodeWords=0;
 const decode=row=>{
  const blocks=new Map(row.blocks.map(b=>[b.address,Buffer.from(b.hex,'hex')]));
  const mesh=blocks.get(row.node);assert.ok(mesh?.length===0x238);
  const index=mesh.readUInt32LE(0x11c),table=mesh.readUInt32LE(0x234);
  assert.equal(index,row.index);assert.equal(table,row.table);
  const tableBytes=blocks.get(table);assert.equal(tableBytes.length,row.levels*8);
  const layout=Array.from({length:row.levels},(_,level)=>{
   const count=tableBytes.readUInt32LE(level*8),groups=blocks.get(tableBytes.readUInt32LE(level*8+4));
   return Array.from({length:count},(_,i)=>{
    const n=groups.readInt32LE(i*40),entries=blocks.get(groups.readUInt32LE(i*40+4));assert.ok(n>=0);
    return Array.from({length:n},(_,j)=>({address:entries.readUInt32LE(j*20),count:entries.readUInt32LE(j*20+4)}));
   });
  });
  return {mesh,index,layout};
 };
 return {reports,get nodeWords(){return nodeWords;},
  entry(row){
   const source=runtime.renderSources().find(s=>s.actor===row.actor);assert.ok(source,'Unknown draw actor');assert.equal(source.node,row.node);
   for(const observed of row.lodNodes){
    const value={levels:observed.levels|0,index:observed.index|0};
    if(!lodNodes.has(observed.address))lodNodes.set(observed.address,value);
    else assert.deepEqual(lodNodes.get(observed.address),value,'Retained LOD entry');
   }
   const {mesh,index,layout}=decode(row),node=loaded.visuals.nodes.get(row.node);
   assert.deepEqual(Array.from(source.local,floatBits),Array.from({length:16},(_,i)=>mesh.readUInt32LE(0x84+i*4)),'Retained draw local matrix');
   assert.deepEqual([...Array.from(source.center,floatBits),...Array.from(source.extent,floatBits)],row.bounds,'Retained draw bounds');
   const flags={hidden:mesh.readUInt32LE(0x12c),needsUpdate:mesh.readUInt32LE(0x180),dispatchReady:mesh.readUInt32LE(0x18c),buffersReady:mesh.readUInt32LE(0x190)};
   if(!actors.has(row.actor))actors.set(row.actor,{layout,flags:{...flags},selection:{index:row.selection|0,enabled:row.enabled,thresholds:row.thresholds.map(v=>v|0)},rect:row.rect.map(v=>v|0),groups:layout.map(level=>level.map(group=>group.map(c=>({node:loaded.visuals.nodes.get(c.address),count:c.count}))))});
   const state=actors.get(row.actor);assert.equal(index,lodNodes.get(row.node).index,'Computed mesh LOD');assert.equal(row.selection|0,state.selection.index,'Retained actor LOD');assert.equal(row.enabled,state.selection.enabled);assert.deepEqual(row.thresholds.map(v=>v|0),state.selection.thresholds,'Retained LOD thresholds');assert.deepEqual(layout,state.layout,'Retained mesh table differs');assert.deepEqual(flags,state.flags,'Retained mesh gates differ');
   assert.deepEqual(row.rect.map(v=>v|0),state.rect,'Retained draw rectangle entry');
   const result=drawMcmRetainedMesh({node,center:source.center,extent:source.extent,projection:floats(row.projection),viewport:row.viewport,mesh:{...state.flags,groups:state.groups,lodNodes},selection:state.selection,rendererMode:row.rendererMode});
   state.flags.needsUpdate=1;state.rect=result.rect;
   if(row.actor===loaded.context.aiController.runtime.id)result.rect.forEach((v,i)=>loaded.context.aiController.body.setInt32(0x488+i*4,v,true));
   if(row.actor===loaded.context.aiController.runtime.id)loaded.context.aiController.body.setInt32(0x4a4,state.selection.index,true);
   queries.push(...result.queries);pending.push({actor:row.actor,frame:row.completedBikeFrames,result});
  },
  query(row){
   const expected=queries.shift();assert.ok(expected,'Unmodeled draw world query');assert.equal(row.node,expected.node,'Computed mesh query target');assert.equal(row.caller,expected.recursive?0x4b6956:0x445711,'Computed mesh query caller');
  },
  exit(row){
   const draw=pending.pop();assert.ok(draw);assert.equal(draw.actor,row.actor);assert.equal(draw.frame,row.completedBikeFrames);assert.equal(queries.length,0,'Missing mesh resolver observations');
   assert.equal(row.selection|0,actors.get(row.actor).selection.index,'Computed actor LOD');
   for(const observed of row.lodNodes)assert.deepEqual(lodNodes.get(observed.address),{levels:observed.levels|0,index:observed.index|0},'Computed recursive LOD');
   assert.deepEqual(row.rect.map(v=>v|0),draw.result.rect,'Computed screen rectangle');
   const seed={visualState:initialRow.visualState.filter(b=>b.size===0x114)};
   assert.equal(row.nodes.length,seed.visualState.length);
   for(let i=0;i<row.nodes.length;i++){
    const observed=row.nodes[i],first=seed.visualState[i];assert.equal(observed.address,first.address);
    const node=loaded.visuals.nodes.get(first.address),bytes=Buffer.from(first.hex,'hex');
    for(const [offset,values]of [[0x84,node.local],[0xc4,node.world]])values.forEach((v,j)=>bytes.writeUInt32LE(floatBits(v),offset+j*4));
    bytes.writeUInt32LE(node.cacheValid>>>0,0x104);assert.equal(bytes.toString('hex'),observed.hex,'Retained post-draw graph differs');nodeWords+=bytes.length/4;
   }
   reports.push({frame:row.completedBikeFrames,actor:row.actor,accepted:draw.result.accepted,rect:draw.result.rect,queries:draw.result.queries.length});
  },
  complete(){assert.equal(pending.length,0,'Unfinished draw');assert.equal(queries.length,0,'Unconsumed mesh queries');}
 };
}
