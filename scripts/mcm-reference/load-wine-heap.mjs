import {CapturedBytes as Buffer} from '../../src/physics/mcm/captured-bytes.js';
import assert from '../../src/physics/mcm/captured-invariants.js';
import {createWineFreeList} from './wine-free-list.mjs';
import {createWineLfhGroup} from './wine-lfh-group.mjs';
// Validate one atomic ordinary-region/LFH metadata snapshot. Large arenas,
// CRT small-block heap, thread routing and virtual-memory growth stay separate.
export function loadWineHeap(snapshot){
 const blocks=new Map(),groups=new Map();
 for(const region of snapshot.regions){
  let next=region.first;
  for(const block of region.blocks){
   assert.equal(block.header,next,'Missing or reordered heap block');assert.ok(!blocks.has(next),'Overlapping heap region');blocks.set(next,block);
   const flags=block.words[1]>>>24,bytes=(flags&1?block.words[0]:block.words[0]&65535)*8;
   assert.ok(bytes>=16&&next+bytes<=region.reservedEnd,'Invalid heap block extent');next+=bytes;
   if(block.lfh){assert.equal(flags&0x80,0x80);assert.equal(block.lfh.address,block.header+8);assert.ok(!groups.has(block.lfh.address));
    const group=createWineLfhGroup(block.lfh);groups.set(block.lfh.address,group);
    for(let i=0;i<31;i++)assert.equal(block.lfh.slots[i].words[1]>>>24,block.lfh.freeBits&(2**i)?0x81:0x80,'LFH bitmap differs from slot headers');
   }else assert.equal(flags&0x80,0,'Missing LFH group');
  }
  assert.ok(next>=region.committedEnd,'Incomplete heap region');
 }
 const freeList=createWineFreeList(snapshot.freeList),seenFree=new Set();
 for(const entry of snapshot.freeList.entries)if(entry.words[1]>>>24===1){assert.deepEqual(blocks.get(entry.header)?.words,entry.words,'Free-list block absent from regions');seenFree.add(entry.header);}
 for(const block of blocks.values())if(block.words[1]>>>24&1)assert.ok(seenFree.has(block.header),'Free block absent from free list');
 const bins=Buffer.from(snapshot.binsHex,'hex'),affinity=Buffer.from(snapshot.affinityHex,'hex');
 assert.equal(bins.length,129*32);assert.equal(affinity.length,129*32*4);
 for(let i=0;i<129;i++){
  assert.equal(bins.readUInt32LE(i*32+24),snapshot.binsAddress+129*32+i*4,'Unexpected affinity table layout');
  const chain=new Set();let pointer=bins.readUInt32LE(i*32+16);
  while(pointer){assert.ok(groups.has(pointer),'Uncaptured shared LFH group');assert.ok(!chain.has(pointer),'LFH group list cycle');chain.add(pointer);pointer=groups.get(pointer).snapshot().next;}
  assert.equal(chain.size,bins.readUInt16LE(i*32+20),'Shared LFH group depth differs');
 }
 let reserved=0;
 for(let o=0;o<affinity.length;o+=4){const pointer=affinity.readUInt32LE(o);if(pointer){assert.ok(groups.has(pointer),'Uncaptured reserved LFH group');reserved++;}}
 return {blocks,groups,freeList,bins,affinity,report:{regions:snapshot.regions.length,blocks:blocks.size,groups:groups.size,slots:groups.size*31,freeBlocks:seenFree.size,reservedGroups:reserved}};
}
