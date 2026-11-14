import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {deriveMcmChaseHeading,selectMcmChasePath} from '../../src/physics/mcm/chase-heading.js';
export function compareChaseHeading(input,output){
 if(!input.length||input.length%208||output.length!==input.length/208*12)throw Error('Incomplete heading capture');let differences=0;const examples=[],paths={};
 for(let o=0;o<input.length;o+=208){
  if(input.readUInt32LE(o+60)!==1)throw Error('Heading capture requires one step');
  const v=Array.from({length:52},(_,i)=>input.readFloatLE(o+i*4)),u=i=>input.readUInt32LE(o+i*4),args={mode:u(11),eyeGate:u(33),crashed:u(35),multiplier:v[44],bike6b0:v[45],bikeBfc:u(46),manager314:u(47),bike8b4:u(48),rider144:u(49),rider170:u(50),rider140:u(51)};
  const result=deriveMcmChaseHeading({yaw:v[29]},args),words=new Uint32Array(Float32Array.of(result.angle,result.heading,0).buffer);words[2]=result.enabled;
  const path=selectMcmChasePath(args.mode,result.enabled);paths[path]=(paths[path]??0)+1;
  for(let i=0;i<3;i++){const native=output.readUInt32LE(o/208*12+i*4);if(native!==words[i]){differences++;if(examples.length<12)examples.push({case:o/208,index:i,native,actual:words[i]});}}
 }
 return {cases:input.length/208,words:output.length/4,paths,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareChaseHeading(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
