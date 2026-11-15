import fs from 'node:fs';
if(!process.argv[3])throw Error('Usage: generate-fog-planes.mjs SUBMISSION_INPUT.bin NEW_INPUT.bin');
const input=fs.readFileSync(process.argv[2]);if(!input.length||input.length%64)throw Error('Incomplete input');const rows=[];
for(let i=0;i<input.length/64;i++){const b=Buffer.alloc(68);input.copy(b,0,i*64,(i+1)*64);b.writeUInt32LE(i%3?1:0,64);b.writeFloatLE([768,100000,100001,0,-1,Infinity,-Infinity,NaN][i%8],48);rows.push(b);}fs.writeFileSync(process.argv[3],Buffer.concat(rows),{flag:'wx'});
