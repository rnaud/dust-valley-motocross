import fs from'node:fs';let seed=56789;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;},out=Buffer.alloc(1024*32);
for(let n=0;n<1024;n++){const a=[random(),n%8===0?1:0,n%64,random()&65535,random()&65535,random()&65535,random()&65535,random()];a.forEach((v,i)=>out.writeUInt32LE(v,n*32+i*4));}fs.writeFileSync(process.argv[2],out,{flag:'wx'});
