import fs from 'node:fs';const rows=[],counters=[0xffffffff,0,1,2,3,4,0x7fffffff,0x80000000];
for(const target of counters)for(const counter of counters)for(const cached of [0,1,2,0xffffffff])for(const previous of [0,1,2])for(const hit of [0,1])for(const down of [0,1])for(const up of [0,1])rows.push(target,counter,cached,previous,hit,down,up);
const out=Buffer.alloc(rows.length*4);rows.forEach((v,i)=>out.writeUInt32LE(v,i*4));fs.writeFileSync(process.argv[2],out,{flag:'wx'});
