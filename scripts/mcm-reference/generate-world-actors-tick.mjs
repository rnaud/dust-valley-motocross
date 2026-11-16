import fs from 'node:fs';const rows=[];let seed=87123;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>8;};
for(let i=0;i<2048;i++){
 const v=[ [0x3c888889,0,0x3f800000,0x80000000][i%4],+(i%17===0),+(i%13===0),random()%2,random()%2,random()%2,[0,0x80000000,0x3f000000,0xbf000000,0x7fc00000,0xffc00000][i%6],random()%2,[-1,0,1,2,3][random()%5],[-1,0,1,2,3,4][random()%6],random()%2,42,i%5,random()%2,random()%2,random()%2,0x3f800000,0x40000000,0xbf800000,i%3===0?42:71];
 for(let j=0;j<4;j++)v.push((i+j)%3===0?42:100+j);
 for(let j=0;j<4;j++)v.push(random()%2);
 v.push(+(i%11===0));const b=Buffer.alloc(116);v.forEach((n,j)=>b.writeUInt32LE(n>>>0,j*4));rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
