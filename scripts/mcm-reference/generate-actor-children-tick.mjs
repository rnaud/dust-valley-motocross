import fs from 'node:fs';
const rows=[];let seed=314159;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(let i=0;i<2048;i++){
 const values=[i%7,[0,0x3c888889,0x7fc00000,0x80000000][i%4],+(i%9!==0),i%3,+(i%5!==0),(i>>1)&1,(i>>2)&1,random(),random(),random(),[0,1,0xffffffff][i%3]];
 for(let j=0;j<6;j++)values.push(+((random()>>>16)%5!==0),+((random()>>>16)%7===0),+((random()>>>16)%4===0),(random()>>>16)%4);
 const b=Buffer.alloc(140);values.forEach((v,j)=>b.writeUInt32LE(v>>>0,j*4));rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
