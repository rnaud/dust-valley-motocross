import {dispatchMcmNodeDraw} from '../../src/physics/mcm/node-draw.js';
export function compareNodeDraw(input,output){
 if(!input.length||input.length%16||output.length!==input.length/16*12)throw Error('Incomplete node oracle data');let differences=0;const branches={hidden:0,prepared:0,prepare:0,fallback:0};
 for(let i=0;i<input.length/16;i++){const [hidden,pending,renderable,prepared]=Array.from({length:4},(_,j)=>input.readUInt32LE(i*16+j*4)),node={hidden,pending,renderable,prepared};let calls=0;const result=dispatchMcmNodeDraw(node,{prepare:()=>calls=calls*4+1,draw:()=>calls=calls*4+2,fallback:()=>calls=calls*4+3});branches[hidden?'hidden':!renderable?'fallback':prepared?'prepared':'prepare']++;for(const [j,v]of [result,node.pending,calls].entries())if(v!==output.readUInt32LE(i*12+j*4))differences++;}
 return {cases:input.length/16,words:output.length/4,differences,branches};
}
