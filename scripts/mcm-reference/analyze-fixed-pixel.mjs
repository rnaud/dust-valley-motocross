import assert from 'node:assert/strict';
import{mcmFixedPixelDescriptor}from'../../src/physics/mcm/fixed-pixel-descriptor.js';
import{mcmFixedVertexDescriptor}from'../../src/physics/mcm/fixed-vertex-descriptor.js';
import{unpackFixedPixelInput}from'./fixed-pixel-input.mjs';
import{lookupMcmFixedPixelCache}from'../../src/physics/mcm/fixed-vertex-cache.js';
export function analyzeFixedPixel(rows,{allowIncomplete=false,onKeyWord=()=>{}}={}){
 let pending=null,vertexSeed=null,inputs=0,descriptors=0,comparisons=0,hits=0,misses=0,keyWords=0,derivedSeedBytes=0;
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
   const nodes=new Map(r.nodes.map(n=>[n.id,n]));assert.equal(nodes.size,r.nodes.length);
   pending.expected=lookupMcmFixedPixelCache(pending.key,r.root,nodes);
  }else if(r.phase==='fixed-pixel-compare'){
   assert.ok(pending?.expected);assert.equal(r.frame,pending.frame);
   assert.deepEqual({node:r.node,result:Math.sign(r.result)},pending.expected.comparisons[pending.index++],'Fixed pixel comparison');comparisons++;
  }else if(r.phase==='fixed-pixel-result'){
   assert.ok(pending?.expected);assert.equal(pending.result,false);assert.equal(r.frame,pending.frame);
   assert.equal(pending.index,pending.expected.comparisons.length);assert.equal(r.node,pending.expected.node);assert.equal(r.miss,pending.expected.node?0:1);
   pending.result=true;if(r.miss)misses++;else hits++;
  }else if(r.phase==='program-key-fields'&&pending){
   assert.equal(r.frame,pending.frame);assert.equal(pending.result,true);
   // Creation remains outside this lookup; only a hit predicts the shader ID.
   if(pending.expected.program!==null){assert.equal(r.key[4],pending.expected.program,'Derived pixel program key');keyWords++;onKeyWord(r,pending.expected.program);}
   pending=null;
  }
 }
 if(!allowIncomplete)assert.equal(pending,null,'Incomplete fixed pixel operation');
 return {inputs,descriptors,comparisons,hits,misses,keyWords,derivedSeedBytes,pending:!!pending};
}
