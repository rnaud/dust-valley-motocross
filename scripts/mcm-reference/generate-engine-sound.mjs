import fs from 'node:fs';const rows=[];
function make(i){const b=Buffer.alloc(0xf6c),u=(o,x)=>b.writeUInt32LE(x>>>0,o),f=(o,x)=>b.writeFloatLE(x,o),bike=0x128,engine=0xdf0,args=0xf50;
 u(0x30,0x12345678);for(let j=0;j<6;j++)u(0x68+j*4,j+1);f(0xb4,[0,1000,2000][i%3]);u(0xb8,i%7);u(0x100,(i>>1)&1);u(0x108,(i>>2)&1);f(0x124,.75);
 u(bike+0x614,+(i%4===0));u(bike+0x618,+(i%4===1));u(bike+0x6f8,+(i%4===2));f(bike+0x6a4,[0,29.3333,29.3334,40][i%4]);f(bike+0xb04,[0,.999,1,2][i%4]);u(bike+0x4bc,(i>>3)&1);u(bike+0x8c4,(i>>4)&1);
 u(engine+0x158,(i+1)%7);f(engine+0x15c,[0,500,1000,1500][(i>>1)%4]);f(args,.02);u(args+4,(i>>5)&1);u(args+8,+(i%13===0));u(args+12,[0,4681,16384,32767][i%4]);u(args+16,(i>>6)&1);u(args+20,i%64);u(args+24,[0,0x2b750,0x2b751][i%3]);rows.push(b);return b;}
for(let i=0;i<512;i++)make(i);
for(let mode=0;mode<4;mode++)for(let value=0;value<6;value++)for(const mask of [0,1,4,63])for(const prior of [0,1])for(const air of [0,1]){
 const b=make(0),bike=0x128,engine=0xdf0,args=0xf50;
 b.writeUInt32LE(+(mode===1),bike+0x614);b.writeUInt32LE(+(mode===2),bike+0x618);b.writeUInt32LE(+(mode===3),bike+0x6f8);
 b.writeFloatLE([0,.999,1,1.001,-1,NaN][value],bike+0xb04);b.writeFloatLE([0,29.33333,29.33334,40,-1,NaN][value],bike+0x6a4);
 b.writeFloatLE(1000,engine+0x15c);b.writeFloatLE(1000+[0,499.999,500,500.001,-1,NaN][value],0xb4);
 b.writeUInt32LE(value%2,args+4);b.writeUInt32LE(mask,args+20);b.writeUInt32LE(prior,0x100);b.writeUInt32LE(air,bike+0x4bc);
 b.writeUInt32LE([0x2b74f,0x2b750,0x2b751][value%3],args+24);
}
for(const random of [0,4681,4682,9362,9363,14043,18724,23405,28086,32767]){
 const b=make(3);b.writeUInt32LE(1,0xf54);b.writeUInt32LE(0,0xf64);b.writeUInt32LE(random,0xf5c);b.writeUInt32LE(0,0x7c);b.writeUInt32LE(1,0x108);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
