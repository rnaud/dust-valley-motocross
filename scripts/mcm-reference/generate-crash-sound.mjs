import fs from 'node:fs';
const offsets=[0x68,0x6c,0x70,0x74,0x78,0x7c,0x80,0x84,0x88,0x8c,0x90,0x94,0x9c,0xa0,0xa4,0xa8,0xac,0xb0,0x60],rows=[];
for(let i=0;i<1024;i++){
 const b=Buffer.alloc(0xf94),u=(o,v)=>b.writeUInt32LE(v>>>0,o),f=(o,v)=>b.writeFloatLE(v,o),bike=0x128,args=0xf50;
 u(0x1c,0x12345678);u(0x30,0xabcdef);u(0x44,500);offsets.forEach((o,j)=>u(o,j+1));
 u(0x98,i%6);u(0x108,i&1);u(0x100,1);u(0x10c,(i>>1)&1);f(0x124,3);
 f(0x11c,[0,.99999994,1,1.1,Infinity,NaN,-1][i%7]);f(0x120,[0,4.9999995,5,5.1,Infinity,NaN,-1][(i>>2)%7]);
 u(bike+0x844,1+i%3);u(bike+0x8c4,(i>>3)&1);u(bike+0x8b4,i%3?1:12);
 const mode=(i>>4)%4;u(bike+0x614,+(mode===1));u(bike+0x618,+(mode===2));u(bike+0x6f8,+(mode===3));f(bike+0xb04,i%2?1:0);f(bike+0x6a4,i%2?40:10);f(0xdf0+0x15c,1000);f(0xb4,i%2?1000:1500);
 f(bike+0x4f8,[0,100,250,301][i%4]);f(bike+0x500,[0,200,250,301][i%4]);
 f(args,[.02,0,.5][i%3]);u(args+4,(i>>6)&1);u(args+12,[0,5461,5462,16384,27306,32767][i%6]);u(args+20,[0,1,0x7ffff,0x55555][(i>>1)%4]);u(args+24,12345);
 u(0xf6c,(i>>7)&1);f(0xf70,i%3?0:10);f(0xf74,500);f(0xf78,0);
 for(let j=0;j<6;j++)u(0xf7c+j*4,199168+j*1000);rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
