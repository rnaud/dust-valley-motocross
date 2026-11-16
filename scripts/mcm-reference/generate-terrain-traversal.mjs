import fs from 'node:fs';
const out=Buffer.alloc(512*32);
for(let n=0;n<512;n++){
 const size=[16,8,4,2,1][n%5],depth=n%4,index=n%16;
 const row=[n%6,(Math.imul(n,2654435761)+17)>>>0,depth,index,size,n%2?16-size:0,n%3?16-size:0,n>>>3];
 row.forEach((v,i)=>out.writeUInt32LE(v,n*32+i*4));
}
fs.writeFileSync(process.argv[2],out,{flag:'wx'});
