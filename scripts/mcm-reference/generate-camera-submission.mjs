import fs from 'node:fs';
if(!process.argv[3])throw Error('Usage: generate-camera-submission.mjs MATRIX_INPUT.bin NEW_INPUT.bin');
const base=fs.readFileSync(process.argv[2]);if(!base.length||base.length%60)throw Error('Incomplete matrix input');const rows=[];
for(let i=0;i<base.length/60;i++){
 const b=Buffer.alloc(64);base.copy(b,0,i*60,i*60+60);
 const planes=[[1,100000],[1,768],[.5,100000],[2,200000],[NaN,100000],[1,NaN],[NaN,NaN],[NaN,768]][i%8];b.writeFloatLE(planes[0],44);b.writeFloatLE(planes[1],48);b.writeFloatLE((i+1)*.125,60);rows.push(b);
}fs.writeFileSync(process.argv[3],Buffer.concat(rows),{flag:'wx'});
