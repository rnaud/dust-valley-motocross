import fs from 'node:fs';
const rows=[];
for(const impact of [-Infinity,-1,0,.001,25,50,99.999,100,101,Infinity,NaN])for(const mask of [0,1,21,42,63])for(const random of [0,5461,5462,10922,16384,21845,27306,32767])for(const volume of [-1,-2500]){
 const b=Buffer.alloc(68);b.writeFloatLE(impact);b.writeInt32LE(volume,4);b.writeUInt32LE(mask,8);
 for(let j=0;j<8;j++)b.writeUInt32LE(j%2?32767-random:random,12+j*4);
 for(let j=0;j<6;j++)b.writeUInt32LE([0,1,199168,882001,0x7fffffff,0xffffffff][j],44+j*4);
 rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
