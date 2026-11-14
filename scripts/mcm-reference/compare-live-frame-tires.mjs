import {loadLiveFrameBootstrap} from './live-frame-bootstrap.mjs';
import {advanceMcmRetainedFrame} from '../../src/physics/mcm/retained-frame.js';
import {floatBits} from '../../src/physics/mcm/math.js';
// First original frame only, stopped at the real 0x4a8be0 tire boundary.
// The uninitialized remainder of the retained runner is not skipped silently.
export function compareLiveFrameTires(inputs,after){
 const {row}=inputs;
 if(after.phase!=='after-tires'||after.playerFrame!==0||after.pass!==0||after.bike!==row.bike||after.frameBits!==row.frameBits)throw Error('Tire observation boundary differs');
 const loaded=loadLiveFrameBootstrap(inputs),stop={},stages=[];
 try{advanceMcmRetainedFrame(loaded.context,{delta:loaded.stack.f32(0xbfc),mode:loaded.mode,input:loaded.input},stage=>{stages.push(stage);if(stage==='tires')throw stop;});}
 catch(error){if(error!==stop)throw error;}
 if(stages.at(-1)!=='tires')throw Error('Tire boundary not reached');

const before=Buffer.from(row.stateHex,'hex'),actual=Buffer.from(after.stateHex,'hex'),expected=Buffer.from(before);
const ints=new Set([0x568,0x8d4,0xbfc,0x820,0x710,0x714,0x814,0x844,0x614,0xc68,0xb04,0xb08,0x724,0x88c,0x884,0x8b0,0xc40,0x8c4,0x8ac,0x4bc,0x870,0xc6c,0xc78,0x620]);
for(const [key,value] of Object.entries(loaded.context.bike)){if(/^field[0-9a-f]+$/.test(key)){const o=parseInt(key.slice(5),16);expected.writeUInt32LE(ints.has(o)?value>>>0:floatBits(value),o);}}
for(const [key,o] of Object.entries({position:0x4f8,velocity:0x510,forward:0x4c0,up:0x4cc,tangent:0x578,rearTangent:0x584,normal:0x54c,offset:0x540,referencePosition:0x504,angularVelocity:0x534,worldAngularVelocity:0x528,localLever:0x654,acceleration:0x51c}))loaded.context.bike[key].forEach((v,i)=>expected.writeUInt32LE(floatBits(v),o+i*4));
expected.writeUInt32LE(floatBits(loaded.context.bike.mass),0x558);expected.writeUInt32LE(floatBits(loaded.context.bike.inverseMass),0x55c);
const differences=[];let changed=0;for(let o=0;o<actual.length;o+=4){if(before.readUInt32LE(o)!==actual.readUInt32LE(o))changed++;if(expected.readUInt32LE(o)!==actual.readUInt32LE(o))differences.push({offset:o.toString(16),original:actual.readUInt32LE(o),recovered:expected.readUInt32LE(o)});}

 return {scope:'Connected first-frame scheduler through tire accumulation from captured state and real terrain. All 818 bike words compared. Engine, component allocations, transforms and stack outputs are not covered by this report; no complete-frame or trajectory parity.',stages,comparedWords:actual.length/4,changedWords:changed,differences:differences.length,firstDifferences:differences.slice(0,20),frontContact:loaded.context.contactPhase.frontContact,rearContact:loaded.context.contactPhase.rearContact};
}
