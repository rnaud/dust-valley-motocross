import fs from 'node:fs';const rows=[];
for(let i=0;i<1024;i++){
 const b=Buffer.alloc(132),u=(o,v)=>b.writeUInt32LE(v>>>0,o*4);
 u(0,+(i>=256));u(1,i&1);u(2,(i>>1)&1);u(3,i%7);u(4,(i>>2)&1);u(5,(i>>3)&1);u(6,(i>>4)&1);u(7,(i>>5)&1);u(8,i%7);
 for(let j=0;j<6;j++){u(9+j*4,[(i>>j)&1,2,3,0xffffffff][i%4]);u(10+j*4,i%11===j?0x88780096:0);u(11+j*4,+(i%13!==j));u(12+j*4,+(i%5!==j));}rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
