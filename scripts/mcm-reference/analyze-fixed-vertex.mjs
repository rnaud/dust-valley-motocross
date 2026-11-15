import {retainFixedCache} from './retain-fixed-cache.mjs';
import assert from 'node:assert/strict';
import{mcmFixedVertexDescriptor}from'../../src/physics/mcm/fixed-vertex-descriptor.js';
import{lookupMcmFixedVertexCache}from'../../src/physics/mcm/fixed-vertex-cache.js';
export function analyzeFixedVertex(rows,{allowIncomplete=false,onKeyWord=()=>{}}={}){
 let cache=null,pending=null,inputs=0,descriptors=0,comparisons=0,hits=0,misses=0,keyWords=0;
 for(const r of rows){
  if(r.phase==='fixed-vertex-input'){
   assert.equal(pending,null,'Unfinished fixed vertex input');assert.equal(r.words.length,35);
   const b=Buffer.alloc(140);r.words.forEach((v,i)=>b.writeUInt32LE(v>>>0,i*4));
   const state=r.words.slice(2,16).concat([...b.subarray(64,68)]);
   const key=mcmFixedVertexDescriptor({declaration:b.subarray(0,6),state,textureCoordinates:r.words.slice(17,25),lights:r.words.slice(25,33),capabilities:b.subarray(132,134),streamFlags:r.words[34]});
   pending={frame:r.frame,esp:r.esp,key:[...key],index:0,result:false};inputs++;
  }else if(r.phase==='fixed-vertex-cache'){
   assert.ok(pending);assert.equal(r.frame,pending.frame);assert.equal(r.esp,pending.esp+4);assert.equal(r.compare,0x7a770000+0x1d8c20);
   assert.deepEqual(r.key,pending.key,'Fixed vertex descriptor');descriptors++;
   cache=retainFixedCache(cache,r,'Fixed vertex');
   pending.expected=lookupMcmFixedVertexCache(pending.key,cache.root,cache.nodes);
  }else if(r.phase==='fixed-vertex-compare'){
   assert.ok(pending?.expected);assert.equal(r.frame,pending.frame);
   assert.deepEqual({node:r.node,result:Math.sign(r.result)},pending.expected.comparisons[pending.index++],'Fixed vertex comparison');comparisons++;
  }else if(r.phase==='fixed-vertex-result'){
   assert.ok(pending?.expected);assert.equal(pending.result,false);assert.equal(r.frame,pending.frame);
   assert.equal(pending.index,pending.expected.comparisons.length);assert.equal(r.node,pending.expected.node);assert.equal(r.miss,pending.expected.node?0:1);
   pending.result=true;if(r.miss)misses++;else hits++;
  }else if(r.phase==='program-key-fields'&&pending){
   assert.equal(r.frame,pending.frame);assert.equal(pending.result,true);
   // Creation remains outside this lookup; only a hit predicts the shader ID.
   if(pending.expected.program!==null){assert.equal(r.key[0],pending.expected.program,'Derived vertex program key');keyWords++;onKeyWord(r,pending.expected.program);}
   pending=null;
  }
 }
 if(!allowIncomplete)assert.equal(pending,null,'Incomplete fixed vertex operation');
 return {inputs,descriptors,comparisons,hits,misses,keyWords,pending:!!pending};
}
