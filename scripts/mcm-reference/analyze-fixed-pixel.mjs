import {retainFixedCache} from './retain-fixed-cache.mjs';
import assert from 'node:assert/strict';
import{mcmFixedPixelDescriptor}from'../../src/physics/mcm/fixed-pixel-descriptor.js';
import{mcmFixedVertexDescriptor}from'../../src/physics/mcm/fixed-vertex-descriptor.js';
import{unpackFixedPixelInput}from'./fixed-pixel-input.mjs';
import{lookupMcmFixedPixelCache}from'../../src/physics/mcm/fixed-vertex-cache.js';
import{insertMcmShaderCacheNode}from'../../src/physics/mcm/shader-cache-insert.js';
export function analyzeFixedPixel(rows,{allowIncomplete=false,onKeyWord=()=>{}}={}){
 let cache=null,pending=null,vertexSeed=null,inputs=0,descriptors=0,comparisons=0,hits=0,misses=0,keyWords=0,derivedSeedBytes=0,creations=0;
 for(const r of rows){
  if(r.phase==='program-key-entry')vertexSeed=null;
  if(r.phase==='fixed-vertex-input'){
   assert.equal(r.words.length,35);const b=Buffer.alloc(140);r.words.forEach((v,i)=>b.writeUInt32LE(v>>>0,i*4));
   vertexSeed=mcmFixedVertexDescriptor({declaration:b.subarray(0,6),state:r.words.slice(2,16).concat([...b.subarray(64,68)]),textureCoordinates:r.words.slice(17,25),lights:r.words.slice(25,33),capabilities:b.subarray(132,134),streamFlags:r.words[34]});
  }
  if(r.phase==='fixed-vertex-cache'){assert.ok(vertexSeed,'Missing vertex descriptor inputs');assert.deepEqual(r.key,[...vertexSeed],'Computed vertex seed');}
  if(r.phase==='fixed-pixel-input'){
   assert.equal(pending,null,'Unfinished fixed pixel input');
   const config=unpackFixedPixelInput(r.words);
   if(vertexSeed){assert.deepEqual([...config.seed.subarray(0,44)],[...vertexSeed],'Vertex-to-pixel temporary buffer');config.seed.set(vertexSeed);derivedSeedBytes+=44;}
   const key=mcmFixedPixelDescriptor(config);
   pending={frame:r.frame,esp:r.esp,key:[...key],index:0,result:false};inputs++;
  }else if(r.phase==='fixed-pixel-cache'){
   assert.ok(pending);assert.equal(r.frame,pending.frame);assert.equal(r.esp,pending.esp+4);assert.equal(r.compare,0x7a770000+0x1d7e60);
   assert.deepEqual(r.key,pending.key,'Fixed pixel descriptor');descriptors++;
   cache=retainFixedCache(cache,r,'Fixed pixel');
   pending.expected=lookupMcmFixedPixelCache(pending.key,cache.root,cache.nodes);
  }else if(r.phase==='fixed-pixel-compare'){
   assert.ok(pending?.expected);assert.equal(r.frame,pending.frame);
   assert.deepEqual({node:r.node,result:Math.sign(r.result)},pending.expected.comparisons[pending.index++],'Fixed pixel comparison');comparisons++;
  }else if(r.phase==='fixed-pixel-result'){
   assert.ok(pending?.expected);assert.equal(pending.result,false);assert.equal(r.frame,pending.frame);
   assert.equal(pending.index,pending.expected.comparisons.length);assert.equal(r.node,pending.expected.node);assert.equal(r.miss,pending.expected.node?0:1);
   pending.result=true;if(r.miss)misses++;else hits++;
  }else if(r.phase==='shader-d5aaa'||r.phase==='shader-d6740'){
   assert.ok(pending?.result&&pending.expected.node===0,'Creation boundary without pixel miss');
   assert.equal(r.frame,pending.frame);assert.ok(r.result,'Unsupported failed pixel allocation/compilation');
   const field=r.phase==='shader-d5aaa'?'allocation':'compiledId';
   assert.equal(pending[field],undefined,'Repeated pixel creation boundary');pending[field]=r.result;
  }else if(r.phase==='fixed-pixel-created'){
   assert.ok(pending?.result&&pending.expected.node===0,'Created pixel without lookup miss');
   assert.equal(r.frame,pending.frame);assert.ok(pending.allocation&&pending.compiledId,'Missing allocation or compiled shader boundary');
   assert.equal(pending.created,undefined,'Repeated pixel creation');
   assert.equal(r.node,pending.allocation,'Allocated pixel node');assert.equal(r.program,pending.compiledId,'Compiled pixel ID');assert.equal(r.registerProgram,pending.compiledId);
   assert.deepEqual(r.key,pending.key,'Created pixel descriptor');
   for(const n of cache.nodes.values()){
    assert.ok(Number.isInteger(n.parent)&&Number.isInteger(n.flags),'Missing initial cache parent/color metadata');
    assert.notEqual(n.program,pending.compiledId,'Created shader aliases an existing ID');
   }
   const compare=(a,b)=>{for(let i=0;i<132;i++)if(a[i]!==b[i])return a[i]<b[i]?-1:1;return 0;};
   assert.equal(insertMcmShaderCacheNode(cache,{id:pending.allocation,key:[...pending.key],program:pending.compiledId},compare),true,'Created duplicate pixel descriptor');
   pending.expected.program=pending.compiledId;pending.created=true;creations++;
  }else if(r.phase==='program-key-fields'&&pending){
   assert.equal(r.frame,pending.frame);assert.equal(pending.result,true);
   // Allocation and GL compilation returns are explicit external inputs on a
   // miss; descriptor copying and tree insertion are computed, not reseeded.
   if(pending.expected.program!==null){assert.equal(r.key[4],pending.expected.program,'Derived pixel program key');keyWords++;onKeyWord(r,pending.expected.program);}
   pending=null;
  }
 }
 if(!allowIncomplete)assert.equal(pending,null,'Incomplete fixed pixel operation');
 return {inputs,descriptors,comparisons,hits,misses,keyWords,derivedSeedBytes,creations,pending:!!pending};
}
