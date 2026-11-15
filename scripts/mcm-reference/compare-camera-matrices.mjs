import {composeMcmCameraMatrices} from '../../src/physics/mcm/camera-matrices.js';
export function compareCameraMatrices(input,output){
 if(!input.length||input.length%60||output.length!==input.length/60*260)throw Error('Incomplete camera matrix data');let differences=0;const examples=[];
 for(let i=0;i<input.length/60;i++){
  const a=Array.from({length:15},(_,j)=>input.readFloatLE(i*60+j*4));const r=composeMcmCameraMatrices({values:a.slice(0,10),fov:a[10],near:a[11],far:a[12],aspect:a[13],width:input.readUInt32LE(i*60+56)});
  const values=Float32Array.from([...r.projection,...r.view,...r.combined,...r.screen,r.screenScale]),words=new Uint32Array(values.buffer);
  for(let j=0;j<65;j++)if(words[j]!==output.readUInt32LE((i*65+j)*4)){differences++;if(examples.length<10)examples.push({case:i,word:j,expected:output.readUInt32LE((i*65+j)*4),actual:words[j]});}
 }return {cases:input.length/60,words:output.length/4,differences,examples};
}
