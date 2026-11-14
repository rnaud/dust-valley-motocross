import {updateMcmFrameEffects} from '../../src/physics/mcm/frame-effects.js';
import {loadFrameEmitter} from './live-frame-effects.mjs';
const ints=[0x8c0,0xc90,0xca8,0xca4,0xcac,0xcb0,0xcb4,0xcbc,0xcc0,0x844,0x4bc],floats=[0xcb8,0x6a4,0x560];
export function compareFrameEffects(input,output){
 const inputSize=0x2008,outputSize=0x1f58;
 if(input.length%inputSize||output.length!==input.length/inputSize*outputSize)throw new Error('Wrong frame-effects oracle sizes');
 const differences=[];let changedWords=0,comparedWords=0;
 for(let i=0;i<input.length/inputSize;i++){
  const source=input.subarray(i*inputSize,(i+1)*inputSize),original=output.subarray(i*outputSize,(i+1)*outputSize),before=original.subarray(0,0xcc8),actual=original.subarray(0xcc8),recovered=Buffer.from(actual);
  const pointerFields=new Set([0x434,0x8f0,0xc84,0xca8,0xc94,0xc98,0xca0]);
  for(let o=0;o<0xcc8;o+=4)if(!pointerFields.has(o)&&source.readUInt32LE(o)!==before.readUInt32LE(o))throw new Error('Unexpected oracle initialization mutation');
  before.copy(recovered);const bike={};
  for(const o of ints)bike['field'+o.toString(16)]=before.readUInt32LE(o);
  for(const o of floats)bike['field'+o.toString(16)]=before.readFloatLE(o);
  const vector=(buffer,offset)=>[0,4,8].map(j=>buffer.readFloatLE(offset+j));
  bike.normal=vector(before,0x54c);bike.offset=vector(before,0x540);
  const emitters=[0,0x84,0x108].map((o,j)=>{const size=j===2?0x480:0x84;return loadFrameEmitter({size,address:j,hex:source.subarray(0xe74+o,0xe74+o+size).toString('hex')},j===2);});
  const s=source.subarray(0x13fc),inputs={};
  for(const [name,o] of Object.entries({rearContact:0x18,frontContact:0x14,control1c:0x1c,control30:0x30}))inputs[name]=s.readUInt32LE(o);
  for(const [name,o] of Object.entries({traction:0x44,tractionLoss:0x68,inverseDt:0x48,rearDelta:0x6c,turnAngle:0x74,rearPerpendicular:0xcc,rearAlignment:0x134,frontPerpendicular:0xc8}))inputs[name]=s.readFloatLE(o);
  for(const [name,o] of Object.entries({rearPoint:0x348,frontPoint:0x324,chassisFront:0x2a0,chassisRear:0x2c4}))inputs[name]=vector(s,o);
  const matrix=Array.from({length:16},(_,j)=>source.readFloatLE(0xe34+j*4));
  const c={bike,engine:{state:source.readFloatLE(0xcc8+0x160)},bodyNode:{cacheValid:1,local:[...matrix],world:[...matrix]},
   frameEffects:{enabled:source.readUInt32LE(0x1ffc),occlusion:0,settingsDisabled:source.readUInt32LE(0x2000),eventState:source.readUInt32LE(0x2004),emitters,inputs}};
  updateMcmFrameEffects(c);
  for(const o of ints)recovered.writeUInt32LE(bike['field'+o.toString(16)]>>>0,o);
  for(const o of floats)recovered.writeFloatLE(bike['field'+o.toString(16)],o);
  bike.normal.forEach((v,j)=>recovered.writeFloatLE(v,0x54c+j*4));bike.offset.forEach((v,j)=>recovered.writeFloatLE(v,0x540+j*4));
  let at=0xcc8;for(const e of emitters){e.bytes.copy(recovered,at);at+=e.bytes.length;}
  c.bodyNode.local.forEach((v,j)=>recovered.writeFloatLE(v,at+j*4));
  const initial=Buffer.concat([before,source.subarray(0xe74,0x13fc),source.subarray(0xe34,0xe74)]);
  for(let o=0;o<actual.length;o+=4){comparedWords++;if(initial.readUInt32LE(o)!==actual.readUInt32LE(o))changedWords++;if(actual.readUInt32LE(o)!==recovered.readUInt32LE(o))differences.push({case:i,offset:o,original:actual.readUInt32LE(o),recovered:recovered.readUInt32LE(o)});}
 }
 return {cases:input.length/inputSize,comparedWords,changedWords,differences};
}
