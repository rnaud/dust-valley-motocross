import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {multiplyWineRenderMatrix} from '../../src/physics/mcm/wine-render-matrix.js';
export function analyzeStateblockProduct(rows){
 let pending=null,store=null,draw=null,calls=0,words=0,differences=0,overlappingStores=0,retainedAtDrawReturn=0;
 const finalWords=new Set();
 const validWords=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(x=>Number.isInteger(x)&&x>=0&&x<=0xffffffff);
 for(const row of rows){
  if(row.phase==='at-00445f85'){assert.equal(draw,null,'Unpaired draw');draw={frame:row.frame,scratch:row.scratchAddress,word:null};}
  if(row.phase==='before-product'){
   assert.equal(pending,null,'Unpaired product');assert.ok(validWords(row.words,32),'Invalid input matrices');
   assert.ok(draw&&draw.frame===row.frame,'Product outside draw');pending=row;
  }else if(row.phase==='product-store'&&row.overlapsScratch){
   assert.ok(pending&&pending.destination===row.destination&&row.destination+8===row.scratchAddress,'Invalid overlapping store');
   assert.equal(store,null,'Unpaired store');store=row;
  }else if(row.phase==='store-after'){
   assert.ok(store&&pending,'Missing store boundary');assert.equal(row.frame,store.frame);
   assert.equal(row.scratchAddress,store.scratchAddress);assert.equal(row.beforeBits,store.scratchBits);
   assert.equal(row.instruction,0x7a83308b);
   const values=new Float32Array(Uint32Array.from(pending.words).buffer);
   const expected=new Uint32Array(multiplyWineRenderMatrix(values.slice(0,16),values.slice(16)).buffer)[2];
   assert.equal(row.scratchBits,expected,'Store does not match input-derived matrix');
   overlappingStores++;draw.word=expected;finalWords.add(expected);store=null;
  }else if(row.phase==='after-product'){
   assert.ok(pending,'Missing product input');assert.equal(store,null,'Missing store completion');
   assert.equal(row.frame,pending.frame);assert.equal(row.destination,pending.destination);
   assert.equal(row.scratchAddress,pending.scratchAddress);assert.ok(validWords(row.words,16),'Invalid output matrix');
   const values=new Float32Array(Uint32Array.from(pending.words).buffer);
   const expected=new Uint32Array(multiplyWineRenderMatrix(values.slice(0,16),values.slice(16)).buffer);
   for(let i=0;i<16;i++){words++;if(expected[i]!==row.words[i])differences++;}
   calls++;pending=null;
  }else if(row.phase==='at-00445f88'){
   assert.ok(draw&&draw.frame===row.frame,'Missing draw input');assert.equal(row.scratchAddress,draw.scratch);
   if(draw.word!==null){assert.equal(row.scratchBits,draw.word,'Later draw write');retainedAtDrawReturn++;}draw=null;
  }
 }
 assert.ok(!pending&&!store&&!draw,'Incomplete capture');
 return {calls,words,differences,overlappingStores,retainedAtDrawReturn,finalWords:[...finalWords]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const rows=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse);
 console.log(JSON.stringify(analyzeStateblockProduct(rows),null,2));
}
