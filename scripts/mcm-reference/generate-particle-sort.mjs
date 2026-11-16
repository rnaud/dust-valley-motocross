import fs from 'node:fs';let seed=1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;},rows=[];
for(const count of [0,1,2,3,7,8,9,10,16,31,32,63,64,127,255,256,511,1000,1024])for(let mode=0;mode<12;mode++){
 const b=Buffer.alloc(4100);b.writeUInt32LE(count);
 for(let i=0;i<1024;i++){const r=random(),value=[i,-i,1,i%2,i%7,(r%1000)/1000,[0,-0][i%2],NaN,[Infinity,-Infinity][i%2],[0,1,NaN,Infinity,-Infinity][i%5],Math.fround((r|0)*1e25),Math.fround((r|0)*1e-40)][mode];b.writeFloatLE(value,4+i*4);}rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
