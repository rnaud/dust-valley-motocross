import fs from 'node:fs';const f=Math.fround;let seed=918729;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};const rows=[];
for(let i=0;i<1000;i++){
 const eye=Array.from({length:3},()=>f((rand()-.5)*6000)),target=i%10===0?eye:i%10===1?[eye[0],f(eye[1]+10),eye[2]]:i%10===2?[eye[0],f(eye[1]-10),eye[2]]:Array.from({length:3},()=>f((rand()-.5)*6000));
 rows.push({values:[...eye,...Array.from({length:7},()=>f(rand()-.5))],target,upValid:i%3,forwardValid:i%4,refreshCounter:i,ownerCounter:i===999?0xffffffff:i*3});
}
const input=Buffer.alloc(rows.length*68);rows.forEach((r,n)=>{[...r.values,...r.target].forEach((x,i)=>input.writeFloatLE(x,n*68+i*4));[r.upValid,r.forwardValid,r.refreshCounter,r.ownerCounter].forEach((x,i)=>input.writeUInt32LE(x,n*68+52+i*4));});const output=process.argv[2];if(!output)throw Error('Usage: generate-camera-target.mjs new-input.bin');fs.writeFileSync(output,input,{flag:'wx'});console.log(JSON.stringify({cases:rows.length,seed:918729,inputBytes:input.length}));
