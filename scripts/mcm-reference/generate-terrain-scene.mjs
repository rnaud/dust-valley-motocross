import fs from 'node:fs';const out=Buffer.alloc(4096*32);let seed=0x411000;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let n=0;n<4096;n++)[n%4,next(),[0,1,0xffffffff,0x80000000][n%4],next(),next(),next(),n%2,(n>>1)%2].forEach((v,i)=>out.writeUInt32LE(v,n*32+i*4));fs.writeFileSync(process.argv[2],out,{flag:'wx'});
