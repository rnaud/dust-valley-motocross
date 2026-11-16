import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {playMcmWreckSound} from '../../src/physics/mcm/wreck-sound.js';
export function compareWreckSound(input,output){
 if(input.length%68||output.length!==input.length/68*1060)throw Error('Invalid wreck corpus length');
 const differences=[];let calls=0;
 for(let row=0;row<input.length/68;row++){
  const b=input.subarray(row*68,(row+1)*68),actual=Buffer.alloc(1060),commands=[];let mask=b.readUInt32LE(8),draw=0;
  const log=(...v)=>commands.push(v),device={
   random(){const v=b.readUInt32LE(12+draw++*4);log(6,0,v,0);return v;},
   playing(n){const v=(mask>>>n)&1;log(5,n,v,0);return v;},
   stop(n,r){mask&=~(1<<n);if(r)actual.writeUInt32LE(0,8+n*4);log(1,n,r,0);},
   seek(n,v){actual.writeUInt32LE(v,8+n*4);log(3,n,v,0);},
   volume(n,v){log(9,n,v>>>0,0);},
   play(n,loop){mask|=1<<n;log(2,n,loop,0);}
  };
  const sounds=Array.from({length:6},(_,n)=>({handle:n,bytes:b.readUInt32LE(44+n*4)}));
  actual.writeUInt32LE(playMcmWreckSound(sounds,b.readFloatLE(0),b.readInt32LE(4),device),0);actual.writeUInt32LE(mask,4);actual.writeUInt32LE(commands.length,32);
  commands.flat().forEach((v,i)=>actual.writeUInt32LE(v>>>0,36+i*4));calls+=commands.length;
  const expected=output.subarray(row*1060,(row+1)*1060);
  for(let o=0;o<1060;o+=4)if(actual.readUInt32LE(o)!==expected.readUInt32LE(o)&&differences.length<20)differences.push({row,offset:o,actual:actual.readUInt32LE(o),expected:expected.readUInt32LE(o)});
 }
 return {cases:input.length/68,words:output.length/4,calls,differences};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=compareWreckSound(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3]));console.log(report);if(report.differences.length)process.exitCode=1;}
