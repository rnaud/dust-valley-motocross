import {floatBits} from '../../src/physics/mcm/math.js';
export function writeFrameAnimation(bytes,state){
 const u=(o,v)=>bytes.writeUInt32LE(v>>>0,o),f=(o,v)=>u(o,floatBits(v));
 for(const [key,o] of [['stopped',4],['blending',0x2c],['field30',0x30]])u(o,state[key]);
 for(const [key,o] of [['remainder',8],['blendTime',0x24],['blendDuration',0x28]])f(o,state[key]);
 for(const [key,o] of [['record',0x10],['frame',0x14],['displayedFrame',0x18],['previousFrame',0x1c],['blendFrame',0x20]])u(o,state[key]?.token??0);
 for(const [key,o] of [['boundsMin',0x218],['boundsMax',0x224]])state[key].forEach((v,i)=>f(o+i*4,v));
}
export function compareFrameRiderVisuals(loaded,row,after,compare){
 if(!row.animationState?.length||row.animationState.length!==after.animationState?.length)throw Error('Missing frame-rider animation observations');
 for(let i=0;i<row.animationState.length;i++){
  const before=row.animationState[i],actual=after.animationState[i];
  if(actual.address!==before.address||actual.size!==before.size)throw Error('Animation observation allocation differs');
  const bytes=Buffer.from(before.hex,'hex'),child=loaded.animation.assets.children.get(before.address);
  if(child)for(const [key,o] of [['forward',8],['up',0x14],['position',0x20]])child[key].forEach((v,k)=>bytes.writeUInt32LE(floatBits(v),o+4*k));
  compare('frame-animation-'+before.address.toString(16),before.hex,actual.hex,bytes);
 }
 if(!row.visualState?.length||row.visualState.length!==after.visualState?.length)throw Error('Missing frame-rider visual observations');
 for(let i=0;i<row.visualState.length;i++){
  const before=row.visualState[i],actual=after.visualState[i];
  if(actual.address!==before.address||actual.size!==before.size)throw Error('Visual observation allocation differs');
  const bytes=Buffer.from(before.hex,'hex'),node=loaded.visuals.nodes.get(before.address);
  if(node){
   for(const [values,o] of [[node.local,0x84],[node.world,0xc4]])values.forEach((v,i)=>bytes.writeUInt32LE(floatBits(v),o+4*i));
   bytes.writeUInt32LE(node.cacheValid>>>0,0x104);
  }else if(before.address===loaded.visuals.rider.address)writeFrameAnimation(bytes,loaded.context.frameRider.riderAnimation);
  else throw Error('Unmapped frame-rider visual allocation');
  compare('frame-rider-visual-'+before.address.toString(16),before.hex,actual.hex,bytes);
 }
}
