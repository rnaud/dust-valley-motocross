import fs from 'node:fs';
const cases=[];
for(let i=0;i<160;i++){
 const b=Buffer.alloc(0x624),u=(o,v)=>b.writeUInt32LE(v>>>0,o),f=(o,v)=>b.writeFloatLE(v,o);
 for(let j=0;j<0x618;j+=4)u(j,0x12340000+j);
 u(0x30,i%17===0?1:0);u(0x34,1);u(0x64,i%19?1:0);
 f(0x38,750);f(0x40,.4);f(0x44,[1,10,60,120][i%4]);f(0x68,[0,.75,.75000006,1][i%4]);f(0x6c,[0,.003,.01][i%3]);
 for(let j=0;j<3;j++){f(0x48+j*4,10+j+i*.01);f(0x54+j*4,9+j+i*.01);f(0x7c+j*4,(j-1)*3.125);}
 u(0x74,[0,11,12][i%3]);u(0x488,[0,255,256][i%3]);u(0x60c,[0,31,32][i%3]);
 for(let j=0;j<32*3;j++)f(0x48c+j*4,(j-50)*.007);
 f(0x618,[.02,.08,0,.25,-.01][i%5]);u(0x61c,i%23===0?1:0);u(0x620,[0,997,999,1000][i%4]);cases.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(cases));
