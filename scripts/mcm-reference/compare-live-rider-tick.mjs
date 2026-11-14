import {loadLiveRiderTick} from './live-rider-tick.mjs';
import {serializeLiveOrderedDispatch} from './compare-live-ordered-dispatch.mjs';
import {writeFrameAnimation} from './compare-live-frame-rider-visuals.mjs';
import {advanceMcmRiderTick} from '../../src/physics/mcm/rider-tick.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function compareLiveRiderTick(before,after,terrain){
 for(const side of [before,after])if(side.world.captureBoundary!=='rider-tick'||side.animations.captureBoundary!=='rider-tick'||side.animations.captureId!==side.world.captureId||side.animations.bikeAddress!==side.world.bikeAddress)throw Error('Rider tick capture boundary differs');
 if(before.world.playerFrame!==after.world.playerFrame||before.world.bikeAddress!==after.world.bikeAddress||before.child.address!==after.child.address||before.child.dtBits!==after.child.dtBits)throw Error('Rider tick pair differs');
 const loaded=loadLiveRiderTick({...before,terrain}),{context:c,ordered,assets,childBytes,proxy,dt}=loaded,r=c.rider;
 const result=advanceMcmRiderTick(c,dt),blocks=serializeLiveOrderedDispatch(ordered,before.world),rb=blocks.find(b=>b.address===r.address).bytes,pb=blocks.find(b=>b.address===proxy).bytes;
 for(const [o,a]of [[0x40,r.position],[0x4c,r.previousPosition],[0xa0,r.center],[0xac,r.extents]])a.forEach((n,j)=>rb.writeFloatLE(n,o+j*4));
 for(const [o,n]of [[0x138,r.field138],[0x13c,r.flag13c],[0x140,r.field140],[0x144,r.field144],[0x154,r.field154],[0x3a4,r.region]])rb.writeUInt32LE(n>>>0,o);rb.writeFloatLE(r.fieldf8,0xf8);writeFrameAnimation(pb,c.animation);
 const differences=[];let comparedWords=1,changedWords=0;
 const compare=(name,initial,actual,recovered)=>{
  const a=Buffer.from(actual,'hex'),b=Buffer.from(initial,'hex');if(a.length!==recovered.length||b.length!==a.length)throw Error('Rider tick allocation differs');
  for(let o=0;o<a.length;o+=4){comparedWords++;const original=a.readUInt32LE(o);if(original!==b.readUInt32LE(o))changedWords++;if(original!==recovered.readUInt32LE(o))differences.push({object:name,offset:o,original,recovered:recovered.readUInt32LE(o)});}
 };
 const compareBlocks=(initial,actual,encode)=>{
  if(initial.length!==actual.length||new Set(actual.map(b=>b.address)).size!==actual.length)throw Error('Rider tick allocation coverage differs');
  const map=new Map(actual.map(b=>[b.address,b]));for(const block of initial){const a=map.get(block.address);if(!a||a.size!==block.size)throw Error('Rider tick allocation changed');compare(block.address.toString(16),block.hex,a.hex,encode(block));}
 };
 const encoded=new Map(blocks.map(b=>[b.address,b.bytes]));compareBlocks(before.world.blocks,after.world.blocks,b=>encoded.get(b.address));
 compareBlocks(before.animations.blocks,after.animations.blocks,b=>{const bytes=Buffer.from(b.hex,'hex'),child=assets.children.get(b.address);if(child)for(const [key,o]of [['forward',8],['up',0x14],['position',0x20]])child[key].forEach((n,j)=>bytes.writeFloatLE(n,o+j*4));return bytes;});
 compare('child',before.child.hex,after.child.hex,childBytes);
 if(floatBits(c.globalDelta)!==after.child.globalDtBits)differences.push({object:'global-delta',original:after.child.globalDtBits,recovered:floatBits(c.globalDelta)});
 return {scope:'Separate rider tick in the active crash-animation/no-terrain-hit branch. Captured collision world, all animation assets, child actor and global timestep compared. Free-rider integration, active particles and crossfade remain explicit unsupported branches; not retained trajectory parity.',frame:before.world.playerFrame,result,callbackTrace:ordered.trace,comparedWords,changedWords,differences};
}
