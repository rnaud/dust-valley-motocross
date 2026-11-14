import fs from 'node:fs';
const cases=[];
const add=(elapsed,frames,period,dt,enabled,steps=1)=>{const b=Buffer.alloc(24);b.writeFloatLE(elapsed,0);b.writeUInt32LE(frames>>>0,4);b.writeFloatLE(period,8);b.writeFloatLE(dt,12);b.writeUInt32LE(enabled>>>0,16);b.writeUInt32LE(steps,20);cases.push(b);};
const elapsed=[0,.25,.4999999701976776,.5,-.5,.75,1,100];
const delta=[0,.02,1/60,.25];
for(let i=0;i<128;i++)add(elapsed[i%8],[0,24,0x7fffffff,0xffffffff][(i>>1)%4],16.75,delta[(i>>3)%4],[0,1,2,0xffffffff][(i>>5)%4]);
for(const dt of [.02,1/60,.25])add(0,0,16.75,dt,1,400);
fs.writeFileSync(process.argv[2],Buffer.concat(cases));
