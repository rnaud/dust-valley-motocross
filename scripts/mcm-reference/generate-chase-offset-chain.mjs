import fs from 'node:fs';let seed=47166;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[];
for(let group=0;group<5;group++)for(let mode=0;mode<8;mode++)for(let actor=0;actor<4;actor++)for(let initialized=0;initialized<2;initialized++)for(let enabled=0;enabled<2;enabled++){
 const row=Buffer.alloc(104);
 for(let i=0;i<26;i++)row.writeFloatLE((random()-.5)*10,i*4);
 row.writeUInt32LE(mode,44);row.writeUInt32LE(actor,48);row.writeUInt32LE(initialized,52);
 row.writeFloatLE([0,.02,.15,.3,.6][group],56);row.writeUInt32LE(group<3?16:1,60);row.writeUInt32LE(enabled,88);rows.push(row);
}
if(!process.argv[2])throw Error('Usage: generate-chase-offset-chain.mjs new-input.bin');
fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
