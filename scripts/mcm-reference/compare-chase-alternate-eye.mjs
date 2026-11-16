import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {deriveMcmAlternateEye} from '../../src/physics/mcm/chase-alternate-eye.js';
export function compareChaseAlternateEye(input,output){
 if(!input.length||input.length%176||output.length!==input.length/176*68)throw Error('Incomplete alternate-eye cases');
 let differences=0;const examples=[];
 for(let n=0;n<input.length/176;n++){
  const v=Array.from({length:44},(_,i)=>input.readFloatLE(n*176+i*4)),u=i=>input.readUInt32LE(n*176+i*4);
  const camera=Object.fromEntries(['pitch','radius','yaw','orbitAngle','height'].map((key,i)=>[key,v[i]])),axis=Float32Array.from(v.slice(40,43));
  const r=deriveMcmAlternateEye(camera,{base:v.slice(6,9),riderPoint:v.slice(9,12),matrix:v.slice(12,28),width:u(28),height:u(29),boundWidth:u(30),boundHeight:u(31),bike890:v[32],bike8a4:u(33),bike8b4:u(34),rider13c:u(35),rider140:u(36),reference:v.slice(37,40)},v[43],axis);
  const words=new Uint32Array(Float32Array.from([...Object.values(camera),...r.target,...r.eye,...r.offset,...axis]).buffer);
  words.forEach((actual,i)=>{const expected=output.readUInt32LE(n*68+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,expected,actual});}});
 }
 return {cases:input.length/176,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareChaseAlternateEye(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
