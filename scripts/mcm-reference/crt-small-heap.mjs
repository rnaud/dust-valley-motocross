import {createCrtSmallPage} from './crt-small-page.mjs';
// Original 4c55d0 / 4c5580 / 4c5440. OS memory operations remain explicit
// services; an absent service never means success or an invented address.
export function createCrtSmallHeap(initial,services={}) {
 const head=initial.head,threshold=initial.threshold;
 let currentRegion=initial.currentRegion,freePageCounter=initial.freePageCounter;
 const regions=new Map(initial.regions.map(r=>[r.address,{address:r.address,bytes:Buffer.from(r.hex,'hex'),pages:new Map(r.pages.map(p=>[p.address,createCrtSmallPage(p)]))}]));
 const word=(r,o)=>r.bytes.readUInt32LE(o),put=(r,o,v)=>r.bytes.writeUInt32LE(v>>>0,o);
 const service=(name,...args)=>{if(!services[name])throw Error(`CRT ${name} service required`);return services[name](...args);};
 const ordered=()=>{const out=[],seen=new Set();let address=head;do{if(seen.has(address)||!regions.has(address))throw Error('Invalid CRT region ring');seen.add(address);const r=regions.get(address);out.push(r);address=word(r,0);}while(address!==head);return out;};
 const ring=ordered();if(ring.length!==regions.size)throw Error('Unlinked CRT region');
 for(const r of ring){
  if(r.bytes.length!==0x814||!regions.has(word(r,4))||word(regions.get(word(r,0)),4)!==r.address)throw Error('Invalid CRT region links');
  const base=word(r,0x810);let count=0;
  if(base%4096||word(r,8)>1024||(word(r,12)!==0xffffffff&&word(r,12)>=1024))throw Error('Invalid CRT region metadata');
  if(base)for(let i=0;i<1024;i++){
   const p=r.pages.get(base+i*4096),free=r.bytes[16+i];
   if(free===255){if(p)throw Error('Unexpected CRT page');continue;}
   if(!p||p.snapshot().freeUnits!==free)throw Error('Missing CRT page');count++;
  }
  if(count!==r.pages.size)throw Error('Unexpected CRT pages');
 }
 if(!regions.has(currentRegion))throw Error('Missing current CRT region');
 function commit(r,units){
  const start=word(r,12),base=word(r,0x810);let end=start+1;
  while(end<Math.min(start+16,1024)&&r.bytes[16+end]===255)end++;
  if(!service('commit',base+start*4096,(end-start)*4096))return null;
  for(let i=start;i<end;i++){
   const address=base+i*4096,b=Buffer.alloc(256);b.writeUInt32LE(address+8,0);b.writeUInt32LE(240,4);b[248]=255;
   r.pages.set(address,createCrtSmallPage({address,freeUnits:240,hex:b.toString('hex')}));r.bytes[16+i]=240;r.bytes[0x410+i]=241;
  }
  let next=end;while(next<1024&&r.bytes[16+next]!==255)next++;
  put(r,12,next<1024?next:0xffffffff);put(r,8,start);currentRegion=r.address;
  // The freshly committed path writes the end cursor directly, even at +248.
  const address=base+start*4096,b=Buffer.from(r.pages.get(address).snapshot().hex,'hex');
  b[8]=units;b.writeUInt32LE(address+8+units,0);b.writeUInt32LE(240-units,4);
  r.bytes[16+start]-=units;r.pages.set(address,createCrtSmallPage({address,freeUnits:240-units,hex:b.toString('hex')}));
  return address+256;
 }
 function createRegion(units){
  const sentinel=regions.get(head),address=word(sentinel,0x810)?service('allocateRegion',0x814):head;
  if(!address)return null;
  const base=service('reserve',0x400000);
  if(!base){if(address!==head)service('freeRegion',address);return null;}
  if(!service('commit',base,65536)){
   service('release',base);if(address!==head)service('freeRegion',address);return null;
  }
  const r=address===head?sentinel:{address,bytes:Buffer.alloc(0x814),pages:new Map()};
  if(address!==head){
   const previous=word(sentinel,4);put(r,0,head);put(r,4,previous);
   put(sentinel,4,address);put(regions.get(previous),0,address);regions.set(address,r);
  }
  put(r,0x810,base);put(r,8,0);put(r,12,16);
  r.bytes.fill(240,16,32);r.bytes.fill(255,32,0x410);r.bytes.fill(241,0x410,0x810);
  r.pages.clear();
  for(let i=0;i<16;i++){
   const page=base+i*4096,b=Buffer.alloc(256);b.writeUInt32LE(page+8,0);b.writeUInt32LE(240,4);b[248]=255;
   if(i===0){b[8]=units;b.writeUInt32LE(page+8+units,0);b.writeUInt32LE(240-units,4);}
   r.pages.set(page,createCrtSmallPage({address:page,freeUnits:i===0?240-units:240,hex:b.toString('hex')}));
  }
  currentRegion=address;r.bytes[16]-=units;return base+256;
 }
 function decommit(){
  let address=word(regions.get(head),4),remaining=16;
  do{
   const r=regions.get(address),base=word(r,0x810);let released=0;
   if(base){
    for(let i=1023;i>=0&&remaining;i--)if(r.bytes[16+i]===240&&service('decommit',base+i*4096,4096)){
     r.bytes[16+i]=255;r.pages.delete(base+i*4096);freePageCounter--;released++;remaining--;
     if(word(r,12)===0xffffffff||i<word(r,12))put(r,12,i);
    }
    address=word(r,4);
    if(released&&r.bytes.subarray(16,1040).every(v=>v===255)){
     service('release',base);
     if(currentRegion===r.address)currentRegion=word(r,4);
     if(r.address===head)put(r,0x810,0);
     else {
      put(regions.get(word(r,4)),0,word(r,0));put(regions.get(word(r,0)),4,word(r,4));
      service('freeRegion',r.address);regions.delete(r.address);
     }
    }
   }else address=word(r,4);
  }while(address!==word(regions.get(head),4)&&remaining>0);
 }
 return {
  allocate(units){
   if(!Number.isInteger(units)||units<1||units>240)throw Error('Invalid CRT allocation units');
   let address=currentRegion;
   do{
    const r=regions.get(address),base=word(r,0x810),start=word(r,8);
    if(base)for(let n=0;n<1024;n++){
     const i=(start+n)%1024,free=r.bytes[16+i];
     if(free===255||units>free||r.bytes[0x410+i]<=units)continue;
     const pointer=r.pages.get(base+i*4096).allocate(units);
     if(pointer!==null){currentRegion=address;r.bytes[16+i]-=units;put(r,8,i);return pointer;}
     r.bytes[0x410+i]=units;
    }
    address=word(r,0);
   }while(address!==currentRegion);
   for(const r of ordered())if(word(r,0x810)&&word(r,12)!==0xffffffff)return commit(r,units);
   return createRegion(units);
  },
  free(pointer){
   const r=ordered().find(r=>{const base=word(r,0x810);return base&&pointer>base&&pointer<base+0x400000;});
   if(!r)throw Error('Pointer outside CRT regions');
   const address=Math.floor(pointer/4096)*4096,i=(address-word(r,0x810))/4096,page=r.pages.get(address);
   if(!page)throw Error('Pointer outside committed CRT pages');
   page.free(pointer);const free=page.snapshot().freeUnits;r.bytes[16+i]=free;r.bytes[0x410+i]=241;
   if(free===240&&++freePageCounter===32)decommit();
  },
  snapshot(){return {head,currentRegion,freePageCounter,threshold,regions:ordered().map(r=>({address:r.address,hex:r.bytes.toString('hex'),pages:[...r.pages.values()].map(p=>p.snapshot()).sort((a,b)=>a.address-b.address)}))};}
 };
}
