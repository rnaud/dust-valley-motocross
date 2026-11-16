import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {tickMcmSceneRenderer}from'../../src/physics/mcm/scene-renderer-tick.js';
import {setMcmCameraClip}from'../../src/physics/mcm/camera-clip.js';
export function compareSceneRenderer(input,output){
 if(!input.length||input.length%32||output.length!==input.length/32*140)throw Error('Incomplete scene renderer cases');
 let differences=0;const examples=[],base=0x21000000;
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4)),b=Buffer.alloc(0x700),trace=[],put=(p,v)=>b.writeUInt32LE(v,p-base),bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
  for(const[o,v]of[[0x20,a[0]],[0x38,a[1]],[0x1c,base+0x100],[0x12c,base+0x200],[0x10c,base+0x500]])put(base+o,v);
  const ret=tickMcmSceneRenderer(base,{u32:p=>b.readUInt32LE(p-base),f32:p=>b.readFloatLE(p-base)},{clip(camera,near,far){trace.push(1,camera,bits(near),bits(far));if(a[2])put(base+0x12c,base+0x300);},matrices(camera){trace.push(2,camera);if(a[3])put(base+0x12c,base+0x400);},submit(device,kind,matrix){trace.push(3,device,kind,matrix);return a[4];},error(...args){trace.push(4,...args);}});
  const words=[ret,b.readUInt32LE(0x12c),trace.length,...trace,...Array(32-trace.length).fill(0)];
  words.forEach((actual,i)=>{const expected=output.readUInt32LE(n*140+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});
 }
 return{cases:input.length/32,words:output.length/4,differences,examples};
}
export function compareCameraClip(input,output){
 if(!input.length||input.length%8||output.length!==input.length)throw Error('Incomplete camera clip cases');let differences=0;const examples=[];
 for(let n=0;n<input.length/8;n++){const camera={retainedMode:0};setMcmCameraClip(camera,input.readFloatLE(n*8),input.readFloatLE(n*8+4));const words=new Uint32Array(Float32Array.of(camera.near,camera.far).buffer);words.forEach((actual,i)=>{const expected=output.readUInt32LE(n*8+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});}
 return{cases:input.length/8,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify((process.argv[2]==='clip'?compareCameraClip:compareSceneRenderer)(fs.readFileSync(process.argv[3]),fs.readFileSync(process.argv[4])),null,2));
