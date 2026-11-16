import {loadWineHeap} from './load-wine-heap.mjs';
export function wineLfhBin(bytes){
 if(bytes>32768)return 128;if(bytes<=512)return Math.floor((bytes-1)/16);
 const bit=Math.floor(Math.log2(bytes-1));return (bit-7)*16+Math.floor(((bytes-1)-2**bit)/(2**bit/16));
}
// Single-thread routing of existing groups. Affinity is an explicit thread
// input. Creating/releasing outer groups remains an ordinary-heap service.
export function createWineLfhRouting(initial){
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
  else return {service:'create-group',bin:index};
  const group=groups.get(address),pointer=group.allocate(size,a);if(pointer===null)throw Error('Unavailable LFH group was routed');
  if(!(group.snapshot().freeBits>>>31))affinity.writeUInt32LE(address,offset);
  return {pointer};
 },free(pointer){
  const pair=owners.get(pointer);
  if(!pair)throw Error('Uncaptured LFH pointer');const[address,group]=pair,s=group.snapshot(),index=wineLfhBin(s.stride),offset=cell(index,s.affinity),slot=(pointer-s.address-24)/s.stride;
  if(s.freeBits===(~(2**slot)>>>0)&&affinity.readUInt32LE(offset)&&depths[index]>32)throw Error('LFH outer-group release service required');
  const result=group.free(pointer);if(result.released){if(!affinity.readUInt32LE(offset))affinity.writeUInt32LE(address,offset);else push(index,address);}
 },snapshot(){return {heads:heads.slice(),depths:depths.slice(),affinityHex:affinity.toString('hex'),groups:[...groups].map(([address,g])=>g.snapshot()).sort((a,b)=>a.address-b.address)};}};
}
