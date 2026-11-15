import assert from 'node:assert/strict';
import {lookupMcmShaderProgramCache} from '../../src/physics/mcm/shader-program-cache.js';
export function analyzeShaderProgramCache(rows,{moduleBase=0x7a770000,allowIncomplete=false}={}) {
 let nodes=null,backend=null,root=null,pending=null,refresh=false,membership=null;
 const keyId=key=>key.map(v=>v>>>0).join(',');
 let snapshots=0,seededNodes=0,lookups=0,comparisons=0,hits=0,misses=0,returns=0,samplerCalls=0,formatCalls=0,samplerFormats=0;
 const reports=[];
 for(const r of rows){
  if(r.phase.startsWith('program-cache-')&&r.phase!=='program-cache-input')assert.ok(pending,'Cache observation without lookup input');
  if(r.phase==='program-cache-input'){
   assert.equal(pending,null,'Unfinished program lookup');assert.equal(r.compare,moduleBase+0x86760);
   if(r.nodes!==null){
    nodes=new Map(r.nodes.map(n=>[n.id,n]));assert.equal(nodes.size,r.nodes.length,'Duplicate cache nodes');
    const observed=new Map(r.nodes.map(n=>[keyId(n.key),n.id]));
    assert.equal(observed.size,nodes.size,'Duplicate cache keys');
    if(membership===null)membership=observed;
    else{
     assert.equal(r.backend,backend,'Unmodeled cache backend change');
     assert.deepEqual(observed,membership,'Cache membership differs from retained creations');
    }
    snapshots++;if(snapshots===1)seededNodes=nodes.size;
   }else{assert.ok(nodes);assert.equal(refresh,false,'Missing post-creation cache snapshot');assert.equal(r.backend,backend);assert.equal(r.root,root);}
   backend=r.backend;root=r.root;refresh=false;
   const expected=lookupMcmShaderProgramCache(r.key,r.root,nodes);
   assert.equal(expected.node,membership.get(keyId(r.key))??0,'Tree lookup differs from retained membership');
   pending={input:r,expected,index:0,result:false,samplers:0,formats:0,binding:false};lookups++;
  }else if(pending&&r.phase==='program-cache-compare'){
   assert.equal(r.frame,pending.input.frame);assert.equal(r.esp,pending.input.esp);
   assert.deepEqual({node:r.node,result:r.result},pending.expected.comparisons[pending.index++],'Shader cache comparison');comparisons++;
  }else if(pending&&r.phase==='program-cache-result'){
   assert.equal(r.frame,pending.input.frame);assert.equal(r.esp,pending.input.esp);assert.equal(pending.result,false);
   assert.equal(pending.index,pending.expected.comparisons.length,'Missing cache comparisons');
   assert.equal(r.node,pending.expected.node,'Shader cache result');assert.equal(r.miss,pending.expected.node?0:1);
   pending.result=true;if(r.miss){misses++;refresh=true;}else hits++;
  }else if(pending&&r.phase==='shader-ec5e0'){
   assert.ok(pending.result);assert.equal(pending.expected.node,0,'Sampler setup on cache hit');
   assert.equal(r.frame,pending.input.frame);assert.equal(r.esp,pending.input.esp-4);
   assert.equal(pending.binding,false);pending.binding=true;
   pending.samplers++;samplerCalls++;
  }else if(pending&&r.phase==='shader-d5a98'){
   assert.equal(pending.binding,true,'Sampler return without entry');pending.binding=false;
  }else if(pending&&r.phase==='shader-138260'){
   assert.ok(pending.result);assert.equal(pending.expected.node,0,'Shader formatting on cache hit');
   pending.formats++;formatCalls++;if(pending.binding)samplerFormats++;
  }else if(pending&&r.phase==='program-cache-return'){
   assert.ok(pending.result);assert.equal(pending.binding,false,'Missing sampler return');assert.equal(r.frame,pending.input.frame);assert.equal(r.esp,pending.input.esp);
   if(pending.expected.node)assert.equal(r.value,pending.expected.node,'Selected cached program');
   else if(r.value){
    assert.ok(![...membership.values()].includes(r.value),'Created program aliases an existing node');
    membership.set(keyId(pending.input.key),r.value);
   }
   reports.push({frame:r.frame,hit:!!pending.expected.node,comparisons:pending.index,samplers:pending.samplers,formats:pending.formats});returns++;pending=null;
  }
 }
 if(!allowIncomplete)assert.equal(pending,null,'Incomplete program lookup');
 return {lookups,comparisons,hits,misses,returns,snapshots,seededNodes,samplerCalls,formatCalls,samplerFormats,pending:pending?1:0,reports};
}
