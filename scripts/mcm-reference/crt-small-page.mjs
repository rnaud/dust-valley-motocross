// Original CRT small-block page search, 0x4c5850. Units are 16 payload bytes.
// Region selection and virtual-memory services belong to the enclosing heap.
export function createCrtSmallPage(initial) {
 const {address}=initial, bytes=Uint8Array.from(Buffer.from(initial.hex,'hex'));
 if(!Number.isInteger(address)||address%4096||bytes.length!==256)throw Error('Invalid CRT page');
 const view=new DataView(bytes.buffer);
 let freeUnits=initial.freeUnits;
 const cursor=()=>view.getUint32(0,true)-address;
 if(cursor()<8||cursor()>248||bytes[248]!==255||!Number.isInteger(freeUnits)||freeUnits<0||freeUnits>240||view.getUint32(4,true)>240)throw Error('Invalid CRT page metadata');
 let used=0;
 for(let offset=8;offset<248;){const size=bytes[offset];if(offset+size>248)throw Error('Invalid CRT allocation extent');used+=size;offset+=size||1;}
 if(240-used!==freeUnits)throw Error('Invalid CRT free-unit count');
 function claim(offset,units,run) {
  const next=offset+units;
  view.setUint32(0,address+(next<248?next:8),true);
  view.setUint32(4,next<248?run-units:0,true);
  bytes[offset]=units;freeUnits-=units;
  return address+128+offset*16;
 }
 return {
  allocate(units) {
   if(!Number.isInteger(units)||units<1||units>240)throw Error('Invalid CRT allocation units');
   const original=cursor(),cached=view.getUint32(4,true);
   if(cached>=units)return claim(original,units,cached);
   let offset=bytes[original+cached]!==0?original+cached:original,remaining=freeUnits;
   while(offset+units<248) {
    if(bytes[offset])offset+=bytes[offset];
    else {
     let end=offset+1;while(bytes[end]===0)end++;
     const run=end-offset;
     if(run>=units)return claim(offset,units,run);
     if(offset===original)view.setUint32(4,run,true);
     else {remaining-=run;if(units>remaining)return null;}
     offset=end;
    }
   }
   offset=8;
   while(offset<original&&offset+units<=247) {
    if(bytes[offset])offset+=bytes[offset];
    else {
     let end=offset+1;while(bytes[end]===0)end++;
     const run=end-offset;
     if(run>=units)return claim(offset,units,run);
     remaining-=run;if(units>remaining)return null;
     offset=end;
    }
   }
   return null;
  },
  free(pointer) {
   const offset=(pointer-address-128)/16;
   let start=8;while(start<offset)start+=bytes[start]||1;
   if(!Number.isInteger(offset)||offset<8||offset>=248||start!==offset||!bytes[offset])throw Error('Invalid CRT free');
   freeUnits+=bytes[offset];bytes[offset]=0;
  },
  snapshot(){return {address,freeUnits,hex:Buffer.from(bytes).toString('hex')};}
 };
}
