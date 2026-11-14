import fs from 'node:fs';
const cases=[];
for(let i=0;i<160;i++){
 const b=Buffer.alloc(0x48c),u=(o,v)=>b.writeUInt32LE(v>>>0,o),f=(o,v)=>b.writeFloatLE(v,o);
 for(let j=0;j<0x480;j+=4)u(j,(0x12340000+j)>>>0);
 u(0x30,i%17===0?1:0);u(0x34,i%19===0?0:1);u(0x64,i%23?1:0);u(0x70,i%29?1:0);u(0x74,i%7===0?1:0);
 f(0x48,[.25,0,-.1,.0001,1][i%5]);f(0x40,[.1,.4,1,2][i%4]);f(0x38,750);
 for(let j=0;j<3;j++){f(0x4c+j*4,10+j+i*.01);f(0x58+j*4,10+j+i*.01-(i%13)*.03*(j+1));}
 u(0x68,[0,14,17][i%3]);u(0x478,[0,254,255][i%3]);
 for(let j=0;j<256;j++)f(0x78+j*4,.1+j*.007);
 f(0x480,[.02,.08,.001,.25][i%4]);u(0x484,i%31===0?1:0);u(0x488,[0,997,999,1000][i%4]);cases.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(cases));
