import fs from 'node:fs';
if(!process.argv[3])throw Error('Usage: generate-chase-heading-chain.mjs factor-input.bin new-input.bin');
const input=fs.readFileSync(process.argv[2]);if(!input.length||input.length%180)throw Error('Incomplete factor input');let seed=473060;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[];
for(let o=0;o<input.length;o+=180){
 const mode=input.readUInt32LE(o+44);if(mode===3||mode===5)continue;
 const b=Buffer.alloc(212);input.copy(b,0,o,o+180);b.writeFloatLE((random()-.5)*10,180);
 [rows.length%2,rows.length%3,b.readUInt32LE(140)?6:5,0,rows.length%2?2:1,rows.length%2].forEach((v,i)=>b.writeUInt32LE(v,(46+i)*4));
 b.writeFloatLE(random()*70,208);rows.push(b);
}
fs.writeFileSync(process.argv[3],Buffer.concat(rows),{flag:'wx'});
