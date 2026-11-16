import fs from 'node:fs';
let seed=0x429e70;const rand=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0,out=[];
for(let n=0;n<4096;n++){
 const b=Buffer.alloc(308);for(let o=0;o<284;o+=4)b.writeUInt32LE(rand(),o);
 [0xbc,0xe0,0xe8].forEach((o,i)=>b.writeUInt32LE((n>>i)&1,o));b.writeUInt32LE(rand()%512,0xe4);
 for(const o of [0xc0,0xc4,0xc8,0xcc])b.writeInt32LE((rand()%1800)-500,o);
 for(const o of [0xd0,0xd4,0xd8,0xdc])b.writeInt32LE(rand()%256,o);
 [rand()%100,rand()%100,320+rand()%1600,240+rand()%900,128,256].forEach((v,i)=>b.writeUInt32LE(v,284+i*4));out.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(out));
