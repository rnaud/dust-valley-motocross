import fs from 'node:fs';
const words=[0,0x80000000,0x3f800000,0xbf800000,0x3f000000,0x7f800000,0xff800000,0x7fc00000,0xffc00000],out=Buffer.alloc(4096*32);
let seed=0x4253e0;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let n=0;n<4096;n++)[n%3,(n>>2)%3,words[next()%words.length],words[next()%words.length],words[next()%words.length],words[next()%words.length],words[next()%words.length],(n>>4)%4].forEach((v,i)=>out.writeUInt32LE(v,n*32+i*4));
fs.writeFileSync(process.argv[2],out,{flag:'wx'});
