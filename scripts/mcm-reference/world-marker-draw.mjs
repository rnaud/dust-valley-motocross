import assert from 'node:assert/strict';
import {drawMcmMarker,drawMcmShape} from '../../src/physics/mcm/marker-draw.js';
import {drawMcmChildren} from '../../src/physics/mcm/child-draw.js';
import {updateMcmMeshComponentCaches} from '../../src/physics/mcm/retained-mesh-draw.js';
const bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
export function connectWorldMarkerDraw(runtime,markers,files,chase){
 const initial=JSON.parse(files['world-marker-mesh.json']);
 assert.equal(initial.captureBoundary,'world-frame-entry');assert.equal(initial.captureId,runtime.world.entry.captureId);
 const marker=markers.markers.get(initial.marker);assert.ok(marker);assert.equal(initial.node,marker.root.address);
 const child=runtime.world.tree.nodes.get(initial.child);assert.equal(child,marker.actor.first);assert.equal(child.address,initial.node+0x14c);assert.equal(child.vtable,0x4d775c);assert.equal(child.next,null);
 const blocks=new Map(initial.blocks.map(b=>[b.address,Buffer.from(b.hex,'hex')])),raw=blocks.get(initial.node);
 assert.equal(raw.length,0x250);assert.deepEqual(raw.subarray(0x14c),child.stateBytes.subarray(0,0x104));
 assert.deepEqual(blocks.get(initial.marker),marker.actor.stateBytes);
 assert.equal(raw.readUInt32LE(0x130),1,'Uncached shape bounds need geometry reconstruction');
 const center=Array.from({length:3},(_,i)=>raw.readFloatLE(0x134+i*4)),extent=Array.from({length:3},(_,i)=>raw.readFloatLE(0x140+i*4));
 const levels=raw.readUInt32LE(0x118),table=blocks.get(raw.readUInt32LE(0x234));assert.equal(table.length,levels*8);
 const groups=Array.from({length:levels},(_,level)=>{
  const count=table.readUInt32LE(level*8),group=blocks.get(table.readUInt32LE(level*8+4));assert.equal(group.length,count*40);
  return Array.from({length:count},(_,i)=>{
   const count=group.readUInt32LE(i*40),entries=blocks.get(group.readUInt32LE(i*40+4));assert.equal(entries.length,count*20);
   return Array.from({length:count},(_,j)=>{const count=entries.readUInt32LE(j*20+4),node=marker.nodes.get(entries.readUInt32LE(j*20));if(count)assert.ok(node,'Missing marker mesh transform');return {count,node};});
  });
 });
 const rows=files['world-marker-draws.jsonl'].trim().split('\n').filter(Boolean).map(JSON.parse),queries=files['world-marker-queries.jsonl'].trim().split('\n').filter(Boolean).map(JSON.parse),reports=[];
 const mesh={hidden:raw.readUInt32LE(0x12c),dispatchReady:raw.readUInt32LE(0x18c),buffersReady:raw.readUInt32LE(0x190),needsUpdate:raw.readUInt32LE(0x180),rect:Array.from({length:4},(_,i)=>raw.readInt32LE(0x240+i*4))};
 const index=raw.readUInt32LE(0x11c);assert.ok(groups[index]);let consumed=0,queryCount=0,comparedWords=0;
 const compareNode=(node,bytes)=>{
  for(const [offset,values]of [[0x84,node.local],[0xc4,node.world]])for(let i=0;i<16;i++){assert.equal(bits(values[i]),bytes.readUInt32LE(offset+i*4),'Marker draw transform differs');comparedWords++;}
  assert.equal(node.cacheValid,bytes.readUInt32LE(0x104));comparedWords++;
 };
 return {reports,step(frame){
  const frameQueries=queries.filter(r=>r.completedBikeFrames===frame+1);let used=0;
  for(const row of rows.filter(r=>r.completedBikeFrames===frame+1)){
   assert.equal(row.captureBoundary,'marker-draw-entry');assert.equal(row.marker,initial.marker);assert.equal(row.node,initial.node);assert.equal(row.camera,initial.camera);
   const expected=new Map(row.blocks.map(b=>[b.address,Buffer.from(b.hex,'hex')])),shape=expected.get(initial.node);
   assert.deepEqual(expected.get(initial.marker),marker.actor.stateBytes);comparedWords+=0xa4/4;compareNode(marker.root,shape);
   for(const [o,value]of [[0x11c,index],[0x12c,mesh.hidden],[0x130,1],[0x180,mesh.needsUpdate],[0x18c,mesh.dispatchReady],[0x190,mesh.buffersReady],...mesh.rect.map((v,i)=>[0x240+i*4,v>>>0])]){assert.equal(shape.readUInt32LE(o),value);comparedWords++;}
   for(let i=0;i<6;i++){assert.equal(shape.readUInt32LE(0x134+i*4),bits([...center,...extent][i]));comparedWords++;}
   const projection=chase.projection;assert.deepEqual(Array.from(projection,bits),row.projection,'Computed marker camera differs');
   let accepted=null,drawQueries=[];
   const result=drawMcmMarker(new DataView(marker.actor.stateBytes.buffer,marker.actor.stateBytes.byteOffset,0xa4),()=>drawMcmChildren({child},{
    unlink:()=>{throw Error('Unrecovered marker destruction');},destroy:()=>{throw Error('Unrecovered marker destruction');},draw:n=>{
     assert.equal(n,child);
     const result=drawMcmShape({node:marker.root,mesh,projection,viewport:row.viewport,bounds:()=>({center,extent})},{
      load:()=>{throw Error('Marker mesh loader is not connected');},alternate:()=>{throw Error('Alternate marker dispatch is not connected');},
      draw:()=>{if(!row.rendererMode&&mesh.needsUpdate)drawQueries=updateMcmMeshComponentCaches(groups[index],node=>{
       const expected=frameQueries[used++];assert.ok(expected,'Unexpected marker world query');assert.equal(expected.node,node.address);assert.equal(expected.caller,0x445711);compareNode(node,Buffer.from(expected.shapeHex,'hex'));
      });}
     });accepted=result.projected?.accepted??null;
     child.stateBytes.writeUInt32LE(mesh.needsUpdate,0x34);mesh.rect.forEach((v,i)=>child.stateBytes.writeInt32LE(v,0xf4+i*4));return result.result;
    }
   }));
   reports.push({frame,result,accepted,queries:drawQueries.length});consumed++;
  }
  assert.equal(used,frameQueries.length,'Unconsumed marker world queries');queryCount+=used;
 },finish(){assert.equal(consumed,rows.length);assert.equal(queryCount,queries.length);return {draws:consumed,queries:queryCount,comparedWords,reports,scope:'Computed marker gates, shape projection and component queries on retained marker state. Draw invocation, viewport and renderer mode remain external boundary inputs; no later marker outputs seed simulation.'};}};
}
