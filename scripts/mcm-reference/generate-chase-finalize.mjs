import fs from 'node:fs';if(!process.argv[2])throw Error('Usage: generate-chase-finalize.mjs NEW_INPUT.bin');const rows=[];let seed=47945;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(let k=0;k<64;k++)for(let mode=0;mode<8;mode++)for(const active of [0,1])for(const enabled of [0,1]){
 const b=Buffer.alloc(172);for(let j=0;j<43;j++)b.writeFloatLE((random()-.5)*100,j*4);
 [active,mode,enabled].forEach((v,i)=>b.writeUInt32LE(v,i*4));
 if(k%8===0)b.copy(b,32,20,32); // target equals new eye: preserve orientation flags/counter.
 if(k%8===1){b.writeFloatLE(b.readFloatLE(20),32);b.writeFloatLE(b.readFloatLE(28),40);} // vertical aim
 [k%2,(k>>1)%2,123,k].forEach((v,i)=>b.writeUInt32LE(v,(21+i)*4));b.writeUInt32LE(k%2,100);b.writeUInt32LE((k>>1)%2,136);rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
