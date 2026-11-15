import {prepareMcmChaseEntry} from '../../src/physics/mcm/chase-entry.js';
import {stepMcmChaseControls} from '../../src/physics/mcm/chase-controls.js';
export function compareChaseEntry(input,output){
 if(input.length%40||!input.length||output.length!==input.length/40*24)throw Error('Incomplete chase entry oracle data');
 let differences=0;const examples=[];
 for(let k=0;k<input.length/40;k++){
  const a=input.subarray(k*40,k*40+40),v=Array.from({length:10},(_,i)=>a.readFloatLE(i*4)),camera={radius:v[3],pitch:v[4],yaw:v[5],backup:v.slice(6,9)};
  const {restoreFlag,eyeGate}=prepareMcmChaseEntry(camera,{mode:a.readUInt32LE(0),restoreFlag:a.readUInt32LE(4),crashed:a.readUInt32LE(8)});
  const {multiplier}=stepMcmChaseControls(camera,{mode:0,active:0,delta:0,multiplierField:v[9]});
  const actual=Buffer.alloc(24);[camera.radius,camera.pitch,camera.yaw].forEach((v,i)=>actual.writeFloatLE(v,i*4));actual.writeUInt32LE(restoreFlag,12);actual.writeUInt32LE(eyeGate,16);actual.writeFloatLE(multiplier,20);
  for(let i=0;i<6;i++)if(actual.readUInt32LE(i*4)!==output.readUInt32LE(k*24+i*4)){differences++;if(examples.length<10)examples.push({case:k,word:i,expected:output.readUInt32LE(k*24+i*4),actual:actual.readUInt32LE(i*4)});}
 }
 return {cases:input.length/40,words:output.length/4,differences,examples};
}
