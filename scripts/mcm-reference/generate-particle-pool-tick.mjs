import fs from 'node:fs';
const cases=[];let seed=0x79132;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let c=0;c<96;c++){
 const b=Buffer.alloc(24+4000+72000),u=(o,v)=>b.writeUInt32LE(v>>>0,o),f=(o,v)=>b.writeFloatLE(v,o);
 const dt=[0,.02,.001,.08,-.01,1/60][c%6],count=[0,1,2,3,10,1000][Math.floor(c/6)%6];
 f(0,dt);u(4,c%13===0?1:0);u(8,count);
 for(let j=0;j<3;j++)f(12+j*4,(random()-.5)*200);
 const order=Array.from({length:1000},(_,i)=>i);if(c%2)order.reverse();
 for(let i=0;i<1000;i++){
  u(24+i*4,order[i]);const base=4024+i*72;
  for(let o=0;o<72;o+=4)u(base+o,0x12340000+i*72+o);
  for(const o of [0,4,8,0x1c,0x20,0x38,0x3c,0x40])f(base+o,(random()-.5)*300);
  const life=100+i*.125;f(base+0x18,life);
  f(base+0x14,[0,life-Math.fround(dt*1000),life,life+1][(i+c)%4]);
  u(base+0x34,((i+c)%8)<<2);
 }
 cases.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(cases));
