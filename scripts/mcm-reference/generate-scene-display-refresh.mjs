import fs from 'node:fs';
const rows=[];
for(const mode of [0,1,2,3,4,5,32767,32768,65535])for(const acquire of [0,1,0x80004005])for(const release of [0,1,0x80004005])for(const mutate of [0,1])rows.push(mode,acquire,release,mutate);
const out=Buffer.alloc(rows.length*4);rows.forEach((v,i)=>out.writeUInt32LE(v,i*4));fs.writeFileSync(process.argv[2],out,{flag:'wx'});
