import {finalizeMcmChaseCamera} from '../../src/physics/mcm/chase-finalize.js';
export function compareChaseFinalize(input,output){
 if(!input.length||input.length%172||output.length!==input.length/172*124)throw Error('Incomplete finalization oracle data');let differences=0;const examples=[];
 for(let i=0;i<input.length/172;i++){
  const a=input.subarray(i*172,(i+1)*172),v=Array.from({length:43},(_,j)=>a.readFloatLE(j*4));
  const camera={values:v.slice(11,21),upValid:a.readUInt32LE(84),forwardValid:a.readUInt32LE(88),refreshCounter:a.readUInt32LE(92)},nodes=[0,1].map(j=>({flag12c:a.readUInt32LE((25+j*9)*4),fields240:Float32Array.from(v.slice(26+j*9,34+j*9))}));
  finalizeMcmChaseCamera(camera,nodes,{active:a.readUInt32LE(0),mode:a.readUInt32LE(4),enabled:a.readUInt32LE(8),bike4e8:v[3],bike4d8:v[4],eye:v.slice(5,8),target:v.slice(8,11),ownerCounter:a.readUInt32LE(96)});
  const actual=Buffer.alloc(124);camera.values.forEach((v,j)=>actual.writeFloatLE(v,j*4));[camera.upValid,camera.forwardValid,camera.refreshCounter].forEach((v,j)=>actual.writeUInt32LE(v,40+j*4));
  nodes.forEach((n,j)=>{actual.writeUInt32LE(n.flag12c,(13+j*9)*4);n.fields240.forEach((v,k)=>actual.writeFloatLE(v,(14+j*9+k)*4));});
  for(let j=0;j<31;j++)if(actual.readUInt32LE(j*4)!==output.readUInt32LE(i*124+j*4)){differences++;if(examples.length<10)examples.push({case:i,word:j,expected:output.readUInt32LE(i*124+j*4),actual:actual.readUInt32LE(j*4)});}
 }
 return {cases:input.length/172,words:output.length/4,differences,examples};
}
