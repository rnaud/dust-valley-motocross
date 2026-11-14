import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const START='at-00467fc8',END='at-00467fcb',BEFORE='at-004206f6',AFTER='at-004206f9';
export function analyzeRenderStack(rows){
 const first=rows.findIndex(r=>r.phase===START);
 if(first<0)throw Error('No complete rendering entry');
 let frame=null,stack=[],frames=0,calls=0,changedFrames=0,maxDepth=0,previousFrame=null;
 const changedCalls={},changedLeafCalls={},endWords={},changes=[];
 for(const row of rows.slice(first)){
  for(const key of ['frame','esp','target','scratchAddress','scratchBits'])if(!Number.isInteger(row[key])||row[key]<0||row[key]>0xffffffff)throw Error('Invalid rendering capture word');
  if(!row.scratchAddress)throw Error('Missing player scratch address');
  if(row.phase===START){
   if(frame||stack.length||(previousFrame!==null&&row.frame!==previousFrame+1))throw Error('Invalid rendering frame order');
   frame={row,calls:0};
  }else{
   if(!frame||frame.row.frame!==row.frame||frame.row.scratchAddress!==row.scratchAddress)throw Error('Unpaired rendering frame');
   if(row.phase===BEFORE){
    if(!row.target)throw Error('Missing child target');
    if(stack.length)stack.at(-1).children++;
    stack.push({row,children:0});calls++;frame.calls++;maxDepth=Math.max(maxDepth,stack.length);
   }else if(row.phase===AFTER){
    const before=stack.pop();
    if(!before||before.row.esp!==row.esp)throw Error('Unpaired rendering return');
    if(before.row.scratchBits!==row.scratchBits){
     const target=`0x${before.row.target.toString(16).padStart(8,'0')}`;
     changedCalls[target]=(changedCalls[target]||0)+1;
     if(!before.children)changedLeafCalls[target]=(changedLeafCalls[target]||0)+1;
    }
   }else if(row.phase===END){
    if(stack.length||!frame.calls||frame.row.esp!==row.esp)throw Error('Incomplete rendering call tree');
    frames++;endWords[row.scratchBits]=(endWords[row.scratchBits]||0)+1;
    if(frame.row.scratchBits!==row.scratchBits){changedFrames++;changes.push({frame:row.frame,before:frame.row.scratchBits,after:row.scratchBits});}
    previousFrame=row.frame;frame=null;
   }else throw Error('Unknown rendering phase');
  }
 }
 if(frame||stack.length||!frames)throw Error('Incomplete rendering capture');
 return {scope:'Observed call boundaries, not recovered rendering or modeled caller scratch. A changed leaf contains a write; its internal writer is not yet identified.',ignoredLeadingPartialRows:first,frames,calls,maxDepth,changedFrames,changedCalls,changedLeafCalls,endWords,changes};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeRenderStack(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
