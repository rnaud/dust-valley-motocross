import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
import {floatBits} from '../../src/physics/mcm/math.js';
// Later observations are assertion targets only. Preserve untouched bytes from
// the single atomic world initialization, then project owned simulation state.
export function projectWorldRider(runtime,address,initial){
 const {loaded,external}=runtime.bikes.get(address),c=loaded.context,r=external.context.rider;
 const bytes=CapturedBytes.from(initial.riderHex,'hex');
 for(const [o,values] of [[0x40,r.position],[0x4c,r.previousPosition],[0x58,r.velocity],[0x64,r.angular],[0x70,r.alternateVelocity],[0x7c,r.alternateAngular],[0xa0,r.center],[0xac,r.extents],[0xb8,r.matrix]])values.forEach((v,i)=>bytes.writeUInt32LE(floatBits(v),o+i*4));
 for(const [o,v] of [[0x138,r.field138],[0x13c,r.flag13c],[0x140,r.field140],[0x144,r.field144],[0x148,r.field148],[0x14c,r.field14c],[0x39c,r.field39c],[0x154,r.field154],[0x16c,c.rider.active16c],[0x170,c.rider.kind],[0x3a4,r.region]])bytes.writeUInt32LE(v>>>0,o);
 c.rider.selected.forEach((v,i)=>bytes.writeUInt32LE(v>>>0,0x160+i*4));bytes.writeFloatLE(r.fieldf8,0xf8);
 return bytes;
}
export function compareWorldRider(runtime,address,initial,event){
 const {external}=runtime.bikes.get(address);
 if(event.bike!==address||event.rider!==external.context.rider.address)throw Error('World rider observation identity differs');
 const bytes=projectWorldRider(runtime,address,initial);
 // Original 40d541 allocates 0x610 bytes before constructor 439e80.
 // Older observers overread eight bytes. Keep those differences visible as
 // diagnostics, but never classify bytes outside the allocation as bike state.
 const differences=[],captureOverread=[];let words=0;
 for(const [name,actual,hex] of [['rider',bytes,event.riderHex],['child',external.childBytes,event.hex]]){
  const expected=CapturedBytes.from(hex,'hex');if(actual.length!==expected.length)throw Error('World rider allocation size differs');
  for(let offset=0;offset<expected.length;offset+=4){if(name==='child'&&offset>=0x610){const a=actual.readUInt32LE(offset),b=expected.readUInt32LE(offset);captureOverread.push({offset:'0x'+offset.toString(16),actual:a,expected:b});continue;}words++;const a=actual.readUInt32LE(offset),b=expected.readUInt32LE(offset);if(a!==b)differences.push({name,offset:'0x'+offset.toString(16),actual:a,expected:b});}
 }
 return {words,differences,...(captureOverread.length?{captureOverread}: {})};
}
