import assert from 'node:assert/strict';
import {tickMcmSceneQueue} from '../../src/physics/mcm/scene-queue-tick.js';
export function connectWorldSceneQueue(runtime){
 const nodes=[...runtime.world.tree.nodes.values()].filter(n=>n.update===0x4253e0);
 assert.equal(nodes.length,1,'Missing or ambiguous scene queue actor');
 const actor=nodes[0],items=new Map();assert.equal(actor.stateBytes?.length,0x58,'Missing scene queue initialization');
 assert.ok(Array.isArray(actor.queueItems),'Missing scene queue items');
 for(const item of actor.queueItems){assert.ok(!items.has(item.address),'Duplicate scene queue item');const bytes=Buffer.from(item.hex,'hex');assert.equal(bytes.length,0x8c);items.set(item.address,bytes);}
 const chain=()=>{const order=[],seen=new Set();let p=actor.stateBytes.readUInt32LE(0x54);while(p){assert.ok(!seen.has(p),'Scene queue cycle');seen.add(p);const bytes=items.get(p);assert.ok(bytes,'Missing retained scene queue item');order.push(p);p=bytes.readUInt32LE(0x88);}return order;};
 assert.equal(chain().length,items.size,'Unreachable scene queue item');
 const memoryBlock=p=>{for(const [address,bytes]of [[actor.address,actor.stateBytes],...items])if(p>=address&&p+4<=address+bytes.length)return{bytes,offset:p-address};throw Error('Missing scene queue memory');};
 const memory={u32:p=>{const{bytes,offset}=memoryBlock(p);return bytes.readUInt32LE(offset);},f32:p=>{const{bytes,offset}=memoryBlock(p);return bytes.readFloatLE(offset);},put32:(p,v)=>{const{bytes,offset}=memoryBlock(p);bytes.writeUInt32LE(v,offset);},putFloat:(p,v)=>{const{bytes,offset}=memoryBlock(p);bytes.writeFloatLE(v,offset);}};
 let ticks=0;
 return {address:actor.address,get ticks(){return ticks;},step(delta,children){ticks++;return tickMcmSceneQueue(actor.address,delta,memory,{children});},
  compare(row){
   assert.ok(row,'Missing scene queue assertion');assert.equal(row.address,actor.address);const differences=[];let words=0;
   const compare=(address,actual,hex)=>{const expected=Buffer.from(hex,'hex');assert.equal(expected.length,actual.length);for(let o=0;o<actual.length;o+=4){words++;const a=actual.readUInt32LE(o),e=expected.readUInt32LE(o);if(a!==e)differences.push({address,offset:o,actual:a,expected:e});}};
   compare(actor.address,actor.stateBytes,row.hex);assert.deepEqual(row.queueItems.map(i=>i.address),chain(),'Scene queue topology differs');
   for(const item of row.queueItems)compare(item.address,items.get(item.address),item.hex);
   return{words,items:items.size,differences};
  }
 };
}
