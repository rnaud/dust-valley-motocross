import fs from 'node:fs';let seed=142031;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[];
for(let i=0;i<1024;i++){
 const scale=10**((i%9)-4),v=Array.from({length:6},()=>Math.fround((random()-.5)*scale));
 if(i%11===0)v.fill(0,0,3);if(i%13===0)v.fill(0,3,6);
 rows.push([...v,Math.fround((random()-.5)*[0,1,10,100,1e6][i%5])]);
}
if(!process.argv[2])throw Error('Usage: generate-runtime-vector-rotation.mjs new-input.bin');
fs.writeFileSync(process.argv[2],Buffer.concat(rows.map(r=>Buffer.from(Float32Array.from(r).buffer))),{flag:'wx'});
