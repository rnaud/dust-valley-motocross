import assert from 'node:assert/strict';
import {analyzeFixedVertex} from './analyze-fixed-vertex.mjs';
import {analyzeFixedPixel} from './analyze-fixed-pixel.mjs';
import {analyzeShaderProgramCache} from './analyze-shader-program-cache.mjs';

// Joined d3120 fixed-function path. Initial cache contents, descriptor inputs
// and the initial selected program remain boundaries; subsequent selections
// and all six lookup-key words are derived. Unsupported paths fail explicitly.
export function analyzeFixedProgramChain(rows) {
 const vertexWords=new Map(),pixelWords=new Map();
 const vertex=analyzeFixedVertex(rows,{onKeyWord:(r,v)=>vertexWords.set(r,v)});
 const pixel=analyzeFixedPixel(rows,{onKeyWord:(r,v)=>pixelWords.set(r,v)});
 const initial=rows.find(r=>r.phase==='program-cache-input');
 assert.ok(initial?.nodes,'Missing initial program cache');
 const programs=new Map(initial.nodes.map(n=>[n.id,n.key]));
 const slots=new Map(),derivedRows=[];
 let pending=null,keys=0,retainedVertex=0,retainedSelections=0;
 for(const r of rows){
  let derived=r;
  if(r.phase==='program-key-entry'){
   assert.equal(pending,null,'Unfinished key assembly');
   assert.ok(r.shaders.length===5&&r.shaders.every(v=>v===0),'Unsupported programmable shader');
   assert.equal(r.flags&28,0,'Unsupported middle-stage update');
   assert.ok(r.flags&1,'Unsupported retained pixel path');
   assert.ok(r.program,'Unsupported initial null program');
   assert.ok(programs.has(r.program),'Unknown previous program');
   assert.deepEqual(r.priorKey,programs.get(r.program),'Previous program key differs from retained cache');
   if(slots.has(r.slot)){assert.equal(r.program,slots.get(r.slot),'Selected program differs from retained return');retainedSelections++;}
   else slots.set(r.slot,r.program);
   pending={entry:r,key:null,input:false};
  }else if(r.phase==='program-key-fields'){
   assert.ok(pending,'Key fields without entry');assert.equal(pending.key,null);assert.equal(r.frame,pending.entry.frame);
   const key=[...programs.get(pending.entry.program)];
   if(pending.entry.flags&2){assert.ok(vertexWords.has(r),'Missing computed vertex ID');key[0]=vertexWords.get(r);}
   else {assert.equal(vertexWords.has(r),false,'Unexpected vertex selection');retainedVertex++;}
   assert.ok(pixelWords.has(r),'Missing computed pixel ID');key[4]=pixelWords.get(r);key[5]=0;
   assert.deepEqual(r.key,key,'Computed complete program key');pending.key=key;keys++;
  }else if(r.phase==='program-cache-input'){
   assert.ok(pending?.key,'Cache lookup without computed key');assert.equal(pending.input,false);assert.equal(r.frame,pending.entry.frame);
   assert.deepEqual(r.key,pending.key,'Computed program lookup input');
   derived={...r,key:pending.key};pending.input=true;
  }else if(r.phase==='program-cache-return'){
   assert.ok(pending?.input,'Return without joined lookup');assert.equal(r.frame,pending.entry.frame);
   if(r.value)programs.set(r.value,pending.key);
   slots.set(pending.entry.slot,r.value);pending=null;
  }
  derivedRows.push(derived);
 }
 assert.equal(pending,null,'Incomplete joined program selection');
 const cache=analyzeShaderProgramCache(derivedRows);
 assert.equal(cache.lookups,keys);assert.equal(cache.returns,keys);
 return {keys,retainedVertex,retainedSelections,vertex,pixel,cache};
}
