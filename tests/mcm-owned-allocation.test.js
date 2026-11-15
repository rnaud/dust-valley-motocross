import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {allocateMcmOwnedArray,freeMcmOwned} from '../src/physics/mcm/owned-allocation.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('owned accounting matches 90 repeated intact original allocator calls',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/owned-allocation-wine11.json',import.meta.url))),native=Buffer.from(f.native,'base64');
 assert.equal(hash(native),f.outputSha256);assert.equal(f.repeatSha256,f.outputSha256);
 assert.equal(f.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 assert.equal(native.length,90*36);
 for(let offset=0;offset<native.length;offset+=36){
  const r=Array.from({length:9},(_,i)=>native.readUInt32LE(offset+i*4));
  const [count,size,success,length,zero]=r;
  assert.equal(success,1);assert.equal(zero,1);
  // This size rule is checked only over the oracle's bounded allocations.
  assert.equal(length,Math.max(16,Math.ceil(count*size/16)*16));
  const owner={bytes:0xfffffff0},accounting={bytes:0x12345678},calls=[];
  const heap={calloc:(c,s)=>{assert.equal(c,count);assert.equal(s,size);return 1;},size:p=>{assert.equal(p,1);calls.push('size');return length;},free:p=>{assert.equal(p,1);calls.push('free');}};
  const pointer=allocateMcmOwnedArray(owner,accounting,heap,count,size);
  assert.deepEqual([accounting.bytes,owner.bytes],r.slice(5,7));
  freeMcmOwned(owner,accounting,heap,pointer);
  assert.deepEqual([accounting.bytes,owner.bytes],r.slice(7));
  assert.deepEqual(calls,['size','size','free']);
 }
});
test('allocation failure leaves counters intact and null free still reaches CRT',()=>{
 const owner={bytes:9},accounting={bytes:10},calls=[];
 const heap={calloc:()=>0,size:()=>assert.fail('null size'),free:p=>calls.push(p)};
 assert.equal(allocateMcmOwnedArray(owner,accounting,heap,2,20),0);
 freeMcmOwned(owner,accounting,heap,0);
 assert.deepEqual([owner.bytes,accounting.bytes,calls],[9,10,[0]]);
});
test('free performs distinct size calls with the original store ordering',()=>{
 const owner={bytes:100},accounting={bytes:200};let calls=0;
 freeMcmOwned(owner,accounting,{size:()=>{if(calls++===0)return 32;assert.equal(accounting.bytes,168);assert.equal(owner.bytes,100);return 16;},free:()=>{assert.equal(owner.bytes,84);}},1);
 assert.equal(calls,2);
});
