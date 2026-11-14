import fs from 'node:fs';let seed=47306;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[];
for(let mode=0;mode<8;mode++)for(let flags=0;flags<256;flags++){
 const b=Buffer.alloc(208);b.writeUInt32LE(mode,44);b.writeUInt32LE(1,48);b.writeUInt32LE(1,52);b.writeUInt32LE(1,60);b.writeFloatLE((random()-.5)*6,116);b.writeUInt32LE((flags>>1)&1,132);b.writeUInt32LE(flags&1,140);b.writeFloatLE(random()*2,176);b.writeFloatLE((random()-.5)*10,180);
 [(flags>>2)&1,((flags>>3)&1)+1,((flags>>4)&1)?6:5,(flags>>5)&1,((flags>>6)&1)?2:1,(flags>>7)&1].forEach((v,i)=>b.writeUInt32LE(v,(46+i)*4));rows.push(b);
}
if(!process.argv[2])throw Error('Usage: generate-chase-heading.mjs new-input.bin');fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
