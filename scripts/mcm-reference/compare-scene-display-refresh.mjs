import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {refreshMcmSceneDisplay} from '../../src/physics/mcm/scene-display-refresh.js';
export function compareSceneDisplayRefresh(input,output){
 if(!input.length||input.length%16||output.length!==input.length/16*268)throw Error('Incomplete display refresh cases');
 let differences=0;const examples=[],base=0x21000000;
 for(let n=0;n<input.length/16;n++){
  const a=Array.from({length:4},(_,i)=>input.readUInt32LE(n*16+i*4)),trace=[],mem=new Map([[0x4e4fb4,base+0x1000],[base+0x30,base+0x200]]);
  for(let i=2;i<=4;i++)mem.set(base+i*0x100+0x18,base+0x500+i*0x100);
  const memory={u32:p=>{if(!mem.has(p))throw Error('Missing refresh memory');return mem.get(p);},i16:p=>{if(p!==base+0x2072)throw Error('Unexpected mode address');return a[0]<<16>>16;}};
  const result=refreshMcmSceneDisplay(base,memory,{
   rectangle(p,r){trace.push(1,p,r);},acquire(p){trace.push(2,p);return{result:a[1],dc:0x12345678};},
   backgroundColor(dc,v){trace.push(3,dc,v);},backgroundMode(dc,v){trace.push(4,dc,v);},textColor(dc,v){trace.push(5,dc,v);},
   draw(p,method,dc){trace.push(6,p,method,dc);if(a[3])mem.set(base+0x30,base+0x300);},
   release(p,dc){trace.push(7,p,dc);return a[2];},error(result,file,line){trace.push(8,result,file,line);},
   blit(p,x,y,flags){trace.push(9,p,x,y,flags);if(a[3])mem.set(base+0x30,base+0x400);},present(p){trace.push(10,p);}
  });
  const actual=[result,mem.get(base+0x30),trace.length,...trace,...Array(64-trace.length).fill(0)];
  actual.forEach((v,i)=>{const expected=output.readUInt32LE(n*268+i*4);if((v>>>0)!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual:v,expected});}});
 }
 return {cases:input.length/16,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareSceneDisplayRefresh(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
