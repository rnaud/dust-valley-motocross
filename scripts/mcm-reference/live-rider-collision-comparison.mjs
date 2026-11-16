import assert from 'node:assert/strict';
import {decodeRiderCollision} from './compare-rider-collision.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';

// Project retained collision objects into their original allocation layout.
// Unmodeled bytes come only from the initial world checkpoint, never a later
// observed entry. Later native allocations are comparison targets exclusively.
export function createLiveRiderCollisionComparison(ordered,bikeAddress){
 const bike=ordered.actors.get(bikeAddress),rider=ordered.actors.get(bike?.riderAddress),object=rider?.collision;
 assert.ok(object,'Missing retained rider collider');
 const initial=Buffer.from(ordered.memory.read(object.address,0x110));
 return event=>{
  const expected=decodeRiderCollision({...event,riderAddress:(event.rider??parseInt(event.riderAddress,16)).toString(16)});
  assert.equal(expected.address,object.address,'Retained collider identity');
  assert.equal(expected.managerAddress,ordered.manager,'Retained collision manager');
  assert.equal(expected.entriesAddress,object.entriesAddress,'Retained collision entries');
  assert.equal(expected.id,object.owner,'Retained collision owner ID');
  assert.equal(expected.count,object.entries.length,'Retained collision entry count');
  assert.equal(parseInt(event.riderAddress??event.rider.toString(16),16),rider.address,'Retained rider identity');
  const state=Buffer.from(initial),entries=Buffer.alloc(object.entries.length*24),pairRow=Buffer.alloc(240),pairColumn=Buffer.alloc(240);
  const put=(o,v)=>state.writeUInt32LE(v>>>0,o),vector=(o,v)=>v.forEach((value,i)=>put(o+i*4,floatBits(value)));
  for(const [offset,values]of [[0x1c,object.matrix],[0x64,object.extents],[0x70,object.localCenter],[0x7c,object.worldCenter],[0xcc,object.contactCC],[0xd8,object.contactD8],[0xe4,object.contactE4]])vector(offset,values);
  put(0x5c,floatBits(object.radius));put(0x60,floatBits(object.radiusSquared));put(0x88,object.other?.address??0);put(0xc8,object.enabled);
  object.callbackAddresses.forEach((v,i)=>put(0x108+i*4,v));
  object.entries.forEach((n,i)=>[n.previous?.token??0,n.next?.token??0,n.owner,n.cell,n.other,n.active].forEach((v,j)=>entries.writeUInt32LE(v>>>0,i*24+j*4)));
  for(let i=0;i<60;i++){pairRow.writeUInt32LE(ordered.dispatch.pairs[object.owner][i]>>>0,i*4);pairColumn.writeUInt32LE(ordered.dispatch.pairs[i][object.owner]>>>0,i*4);}
  const differences=[];let words=1;
  if(ordered.enabled!==expected.enabled)differences.push({name:'grid-enabled',offset:0,actual:ordered.enabled,expected:expected.enabled});
  for(const [name,actual]of Object.entries({state,entries,pairRow,pairColumn})){
   assert.equal(actual.length,expected[name].length);
   for(let o=0;o<actual.length;o+=4){words++;const a=actual.readUInt32LE(o),b=expected[name].readUInt32LE(o);if(a!==b)differences.push({name,offset:o,actual:a,expected:b});}
  }
  return {words,differences};
 };
}
