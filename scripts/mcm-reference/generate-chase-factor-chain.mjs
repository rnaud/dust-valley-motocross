import fs from 'node:fs';
if(!process.argv[3])throw Error('Usage: generate-chase-factor-chain.mjs active-input.bin new-factor-input.bin');
const input=fs.readFileSync(process.argv[2]);if(!input.length||input.length%156)throw Error('Incomplete active input');
const output=Buffer.alloc(input.length/156*180);let seed=47685;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(let i=0;i<input.length/156;i++){
 input.copy(output,i*180,i*156,(i+1)*156);
 for(let j=39;j<42;j++)output.writeFloatLE((random()-.5)*30,i*180+j*4);
 output.writeFloatLE(.1+random()*500,i*180+168);output.writeFloatLE(.1+random()*50,i*180+172);output.writeFloatLE(random()*2,i*180+176);
}
fs.writeFileSync(process.argv[3],output,{flag:'wx'});
