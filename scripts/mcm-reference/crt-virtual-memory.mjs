import {CapturedBytes as Buffer} from '../../src/physics/mcm/captured-bytes.js';
// Retained committed-page map for the CRT's already-reserved 4 MiB regions.
// Commit/decommit addresses are calculated by the CRT, never observed outputs.
// Choosing a new reservation requires the wider process virtual-address map.
export function createCrtVirtualMemory(initial){
 const regions=new Map(initial.regions.map(r=>[Buffer.from(r.hex,'hex').readUInt32LE(0x810),new Set(r.pages.map(p=>p.address))]).filter(([base])=>base));
 let commits=0,decommits=0,releases=0;
 function regionFor(address,size){
  if(!Number.isInteger(address)||address%4096||!Number.isInteger(size)||size<=0||size%4096)throw Error('Invalid CRT virtual-memory range');
  for(const [base,pages]of regions)if(address>=base&&address+size<=base+0x400000)return pages;
  throw Error('CRT virtual-memory range outside captured reservations');
 }
 return {
  commit(address,size){const pages=regionFor(address,size);for(let p=address;p<address+size;p+=4096)pages.add(p);commits++;return true;},
  decommit(address,size){const pages=regionFor(address,size);for(let p=address;p<address+size;p+=4096)pages.delete(p);decommits++;return true;},
  release(base){if(!regions.delete(base))throw Error('Unknown CRT reservation');releases++;return true;},
  reserve(){throw Error('Process virtual-address reservation service required');},
  report(){return {commits,decommits,releases,reservations:regions.size,committedPages:[...regions.values()].reduce((n,p)=>n+p.size,0)};},
 };
}
