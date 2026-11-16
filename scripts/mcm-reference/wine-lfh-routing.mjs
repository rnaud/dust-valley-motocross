import {createWineLfhGroup} from './wine-lfh-group.mjs';
import {loadWineHeap} from './load-wine-heap.mjs';
export function wineLfhBin(bytes){
 if(bytes>32768)return 128;if(bytes<=512)return Math.floor((bytes-1)/16);
 const bit=Math.floor(Math.log2(bytes-1));return (bit-7)*16+Math.floor(((bytes-1)-2**bit)/(2**bit/16));
}
// Single-thread routing of existing groups. Affinity is an explicit thread
// input. Creating/releasing outer groups remains an ordinary-heap service.
export function wineLfhStride(index){if(!Number.isInteger(index)||index<0||index>=128)throw Error('Invalid LFH bin');return index<32?(index+1)*16:2**(Math.floor(index/16)+3)*(17+index%16);}
export function createWineLfhRouting(initial,services={}){
 const {groups,bins,affinity}=loadWineHeap(initial),heads=Array.from({length:129},(_,i)=>bins.readUInt32LE(i*32+16)),depths=Array.from({length:129},(_,i)=>bins.readUInt16LE(i*32+20));
 const owners=new Map();for(const [address,group]of groups)for(const slot of group.snapshot().slots)owners.set(slot.header+8,[address,group]);
 const cell=(index,a)=>(a*129+index)*4;
 const push=(index,address)=>{groups.get(address).setNext(heads[index]);heads[index]=address;depths[index]++;};
 return {allocate(size,a){
  if(!Number.isInteger(size)||size<0||size>0x7efe0||!Number.isInteger(a)||a<0||a>31)throw Error('Invalid LFH routing input');
  const bytes=Math.max(24,Math.ceil((Math.max(8,size)+8)/8)*8),index=wineLfhBin(bytes);
  if(index===128||!bins.readUInt32LE(index*32+8))return {service:'ordinary'};
  const offset=cell(index,a);let address=affinity.readUInt32LE(offset);
  if(address)affinity.writeUInt32LE(0,offset);
  else if(heads[index]){address=heads[index];heads[index]=groups.get(address).snapshot().next;depths[index]--;}
  else {
   if(!services.createGroup)return {service:'create-group',bin:index};
   const initial=services.createGroup(wineLfhStride(index));if(!initial)return {service:'ordinary'};
   address=initial.address;if(groups.has(address))throw Error('Duplicate LFH group');
   const group=createWineLfhGroup(initial);groups.set(address,group);
   for(const slot of initial.slots)owners.set(slot.header+8,[address,group]);
  }
  const group=groups.get(address),pointer=group.allocate(size,a);if(pointer===null)throw Error('Unavailable LFH group was routed');
  if(!(group.snapshot().freeBits>>>31))affinity.writeUInt32LE(address,offset);
  return {pointer};
 },free(pointer){
  const pair=owners.get(pointer);
  if(!pair)throw Error('Uncaptured LFH pointer');const[address,group]=pair,s=group.snapshot(),index=wineLfhBin(s.stride),offset=cell(index,s.affinity),slot=(pointer-s.address-24)/s.stride;
  if(s.freeBits===(~(2**slot)>>>0)&&affinity.readUInt32LE(offset)&&depths[index]>32&&!services.releaseGroup)throw Error('LFH outer-group release service required');
  const result=group.free(pointer);if(result.released){if(!affinity.readUInt32LE(offset))affinity.writeUInt32LE(address,offset);else if(depths[index]<=32)push(index,address);else {
   services.releaseGroup(address);groups.delete(address);for(const slot of s.slots)owners.delete(slot.header+8);
  }}
 },owns(pointer){return owners.has(pointer);},size(pointer){
  const pair=owners.get(pointer);if(!pair)throw Error('Unknown LFH pointer');const s=pair[1].snapshot(),slot=s.slots[(pointer-s.address-24)/s.stride];
  if(slot.words[1]>>>24!==0x80)throw Error('Size of free LFH block');return s.stride-8-(slot.words[0]>>>16);
 },recordOrdinaryAllocation(bytes){
  const index=wineLfhBin(bytes),offset=index*32,alloc=(bins.readUInt32LE(offset)+1)>>>0,freed=bins.readUInt32LE(offset+4);bins.writeUInt32LE(alloc,offset);
  if(!bins.readUInt32LE(offset+8)){
   const used=(alloc-freed)>>>0,stride=index===128?0xffffffff:wineLfhStride(index);
   if((index===0&&alloc>16)||(index<48&&(alloc>2048||used>16))||used>Math.floor(0x400000/stride))bins.writeUInt32LE(1,offset+8);
  }
 },recordOrdinaryFree(bytes){const offset=wineLfhBin(bytes)*32+4;bins.writeUInt32LE((bins.readUInt32LE(offset)+1)>>>0,offset);},
 binCounters(){return Array.from({length:129},(_,i)=>[bins.readUInt32LE(i*32),bins.readUInt32LE(i*32+4),bins.readUInt32LE(i*32+8)]);},
 snapshot(){return {heads:heads.slice(),depths:depths.slice(),affinityHex:affinity.toString('hex'),groups:[...groups].map(([address,g])=>g.snapshot()).sort((a,b)=>a.address-b.address)};}};
}
