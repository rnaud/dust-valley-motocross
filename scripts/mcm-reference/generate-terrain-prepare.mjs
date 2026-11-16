import fs from'node:fs';const out=Buffer.alloc(512*32);let seed=0x4125b0;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let n=0;n<512;n++)[n%4,(n>>2)%4,(n>>4)%2,[0,0xfffffff0,0x80000000,1][n%4],next(),(n>>5)%2,next(),next()].forEach((v,i)=>out.writeUInt32LE(v,n*32+i*4));fs.writeFileSync(process.argv[2],out,{flag:'wx'});
