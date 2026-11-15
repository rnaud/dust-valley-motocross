import {applyMcmFogPlanes} from '../../src/physics/mcm/fog-planes.js';
export function compareFogPlanes(input,output){
 if(!input.length||input.length%68||output.length!==input.length/68*268)throw Error('Incomplete fog oracle data');let differences=0,rebuilt=0;const examples=[];
 for(let i=0;i<input.length/68;i++){
  const a=Array.from({length:16},(_,j)=>input.readFloatLE(i*68+j*4)),camera={values:a.slice(0,10),fov:a[10],near:a[11],far:a[12],aspect:a[13],width:input.readUInt32LE(i*68+56)};
  const initial={projection:new Float32Array(16).fill(a[15]),view:new Float32Array(16).fill(a[15]),combined:new Float32Array(16).fill(a[15]),screen:new Float32Array(16).fill(a[15]),screenScale:a[15]};
  const r=applyMcmFogPlanes(camera,{enabled:input.readUInt32LE(i*68+64),far:a[12]},initial),m=r.matrices;if(r.rebuilt)rebuilt++;
  const values=Float32Array.from([...m.projection,...m.view,...m.combined,...m.screen,m.screenScale,camera.near,camera.far]),words=new Uint32Array(values.buffer);
  for(let j=0;j<67;j++)if(words[j]!==output.readUInt32LE((i*67+j)*4)){differences++;if(examples.length<10)examples.push({case:i,word:j,expected:output.readUInt32LE((i*67+j)*4),actual:words[j]});}
 }return {cases:input.length/68,words:output.length/4,rebuilt,differences,examples};
}
