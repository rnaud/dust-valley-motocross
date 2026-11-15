import fs from 'node:fs';
if(!process.argv[2])throw Error('Usage: generate-node-draw.mjs NEW_INPUT.bin');const rows=[];
for(const hidden of [0,1,2,0xffffffff,0x80000000])for(const pending of [0,1,2,0xffffffff,0x80000000])for(const renderable of [0,1,2,0xffffffff,0x80000000])for(const prepared of [0,1,2,0xffffffff,0x80000000]){const b=Buffer.alloc(16);[hidden,pending,renderable,prepared].forEach((v,i)=>b.writeUInt32LE(v,i*4));rows.push(b);}fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
