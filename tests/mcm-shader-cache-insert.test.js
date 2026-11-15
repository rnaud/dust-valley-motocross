import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {insertMcmShaderCacheNode} from '../src/physics/mcm/shader-cache-insert.js';
test('cache insertion matches every native root, parent, child and color word',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/shader-cache-insert-wine11.json.br',import.meta.url))));
 const input=Buffer.from(f.input,'base64'),expected=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(expected),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);
 assert.equal(f.cases,2048);assert.equal(f.nodesPerCase,16);
 const actual=Buffer.alloc(expected.length);let offset=0,duplicates=0;
 for(let c=0;c<f.cases;c++){
  const tree={root:0,nodes:new Map()};
  for(let j=0;j<16;j++){
   const key=input.readUInt32LE(c*64+j*4);
   if(!insertMcmShaderCacheNode(tree,{id:j+1,key},(a,b)=>a<b?-1:a>b?1:0))duplicates++;
   const words=[tree.root];
   for(let k=0;k<16;k++){
    const n=tree.nodes.get(k+1);
    words.push(n?.parent??0,n?.left??0,n?.right??0,n?.flags??((0xa5a50000+k*2)>>>0));
   }
   for(const w of words){actual.writeUInt32LE(w>>>0,offset);offset+=4;}
  }
  const start=c*16*65*4;
  assert.deepEqual(actual.subarray(start,offset),expected.subarray(start,offset),`Native insertion sequence ${c}`);
 }
 assert.equal(offset,expected.length);assert.equal(duplicates,3087);
});
