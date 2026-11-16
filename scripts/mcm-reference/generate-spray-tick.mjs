import fs from 'node:fs';const cases=[];
function make(i){
 const b=Buffer.alloc(0x62c),u=(o,x)=>b.writeUInt32LE(x>>>0,o),f=(o,x)=>b.writeFloatLE(x,o);
 for(let o=0;o<0x614;o+=4)u(o,0x12340000+o);
 u(0x30,+(i%17===0));u(0x34,1);u(0x64,+(i%23!==0));u(0x70,[29,43,44][i%3]);u(0x74,20);
 f(0x38,375);f(0x40,1);f(0x44,[0,10,100,200][i%4]);f(0x68,[0,.001,.1][i%3]);
 for(let j=0;j<3;j++){f(0x48+j*4,10+j+i*.03);f(0x54+j*4,10+j+i*.03-(i%11)*.1*(j+1));f(0x78+j*4,[-2,.7,3][j]);}
 for(let j=0;j<256;j++)f(0x84+j*4,.01+j*.0008);
 u(0x484,[0,254,255,256][i%4]);for(let j=0;j<96;j++)f(0x488+j*4,.5+j*.007);
 u(0x608,[0,30,31,32][i%4]);f(0x60c,.3);f(0x610,-.2);
 f(0x614,[0,.001,.02,.08,.25,4][i%6]);u(0x618,+(i%31===0));u(0x61c,[0,997,999,1000][i%4]);[.1,-9.8,.2].forEach((x,j)=>f(0x620+j*4,x));cases.push(b);return b;
}
for(let i=0;i<320;i++)make(i);
for(const rate of [0,1,10,200])for(const dt of [0,.001,.02,.08,.25,4])for(const count of [0,997,999,1000])for(const index of [0,31,32]){
 const b=make(1);b.writeFloatLE(rate,0x44);b.writeFloatLE(dt,0x614);b.writeUInt32LE(count,0x61c);b.writeUInt32LE(index,0x608);b.writeUInt32LE(index===32?256:255,0x484);
}
for(const word of [0x7fc00000,0xffc00000,0x7f800000,0xff800000])for(const count of [0,999]){
 const b=make(1);b.writeUInt32LE(word,0x68);b.writeUInt32LE(count,0x61c);
}
fs.writeFileSync(process.argv[2],Buffer.concat(cases));
