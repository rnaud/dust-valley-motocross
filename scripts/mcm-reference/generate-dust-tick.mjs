import fs from 'node:fs';
const cases=[];
const make=(i,dt,distance,intensity,count)=>{
 const b=Buffer.alloc(0x90),u=(o,v)=>b.writeUInt32LE(v>>>0,o),f=(o,v)=>b.writeFloatLE(v,o);
 for(let j=0;j<0x84;j+=4)u(j,0x12340000+j);
 u(0x30,+(i%17===0));u(0x34,i%19?1:0);u(0x64,+(i%23!==0));u(0x68,+(i%29!==0));u(0x74,i%13);u(0x78,8);u(0x80,0xff884422);
 f(0x60,[.1,.2,.8,2][i%4]);f(0x7c,intensity);
 for(let j=0;j<3;j++){f(0x48+4*j,10+j+i*.01);f(0x54+4*j,10+j+i*.01-distance*(j+1));}
 f(0x84,dt);u(0x88,+(i%31===0));u(0x8c,count);cases.push(b);
};
for(let i=0;i<192;i++)make(i,[.02,.08,.001,.25][i%4],(i%13)*.03,[0,1,2,.01][i%4],[0,997,999,1000][i%4]);
for(const dt of [0,.001,.02,.08,.25,4])for(const distance of [0,.0001,.01,.1,1,10,30,100])for(const intensity of [0,.01,1,2])for(const count of [0,997,999,1000])make(cases.length,dt,distance,intensity,count);
for(const word of [0x7fc00000,0xffc00000,0x7f800000,0xff800000])for(const count of [0,999]){
 make(1,.02,.1,1,count);cases.at(-1).writeUInt32LE(word,0x60);
}
fs.writeFileSync(process.argv[2],Buffer.concat(cases));
