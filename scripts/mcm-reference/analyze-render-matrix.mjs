import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const pairs=new Map([
 ['at-0044fb04',{after:'at-0044fb0c',delta:4,target:'0x004b7a00'}],
 ['at-0044fb1c',{after:'at-0044fb27',delta:8,target:'0x0044f870'}],
 ['at-0044fee0',{after:'at-0044feec',delta:20,target:'0x0047e8a0'}],
 ['at-0044ff44',{after:'at-0044ff4f',delta:8,target:'0x004b8b30'}],
 ['at-0044ff5c',{after:'at-0044ff64',delta:0,target:'0x004465b0'}],
 ['at-0044ff89',{after:'at-0044ff90',delta:0,target:'0x004206c0'}],
]);
export function analyzeRenderMatrix(rows){
 let frame=null,frames=0;const stack=[],calls={},changedCalls={};
 if(!rows.length)throw Error('Empty matrix capture');
 for(const row of rows){
  for(const key of ['frame','esp','scratchAddress','scratchBits'])if(!Number.isInteger(row[key])||row[key]<0||row[key]>0xffffffff)throw Error('Invalid matrix capture word');
  if(!row.scratchAddress)throw Error('Missing scratch identity');
  if(row.phase==='at-00467fc8'){
   if(frame||stack.length||row.frame!==frames)throw Error('Invalid frame entry');frame=row;
  }else{
   if(!frame||row.frame!==frame.frame||row.scratchAddress!==frame.scratchAddress)throw Error('Invalid frame identity');
   if(row.phase==='at-00467fcb'){
    if(stack.length||row.esp!==frame.esp)throw Error('Incomplete matrix frame');frame=null;frames++;
   }else if(pairs.has(row.phase))stack.push({row,pair:pairs.get(row.phase)});
   else{
    const before=stack.pop();
    if(!before||before.pair.after!==row.phase||row.esp-before.row.esp!==before.pair.delta)throw Error('Invalid matrix return');
    const key=before.pair.target;calls[key]=(calls[key]||0)+1;
    if(before.row.scratchBits!==row.scratchBits)changedCalls[key]=(changedCalls[key]||0)+1;
   }
  }
 }
 if(frame||stack.length)throw Error('Incomplete matrix capture');
 return {scope:'Call-boundary observations; no scratch injection and no exact internal writer claim.',frames,calls,changedCalls};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeRenderMatrix(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
