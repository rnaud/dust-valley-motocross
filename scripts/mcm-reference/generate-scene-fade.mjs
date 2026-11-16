import fs from 'node:fs';
const bits=x=>new Uint32Array(Float32Array.of(x).buffer)[0],values=[0,0x80000000,1,0x80000001,bits(.25),bits(.5),bits(1),bits(2),bits(-1),0x7f800000,0xff800000,0x7fc00000,0xffc00000],rows=[];
for(const up of [0,1,0xffffffff])for(const down of [0,1,2])for(const duration of values)for(const elapsed of values)for(const delta of [bits(.016),0,bits(.5),bits(-.25)])rows.push(down,up,duration,elapsed,delta,0xdeadbeef);
const out=Buffer.alloc(rows.length*4);rows.forEach((v,i)=>out.writeUInt32LE(v,i*4));fs.writeFileSync(process.argv[2],out,{flag:'wx'});
