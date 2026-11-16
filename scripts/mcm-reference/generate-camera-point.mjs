import fs from 'node:fs';
let seed=0x47e650;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const output=Buffer.alloc(4096*88);
for(let n=0;n<4096;n++){
 const m=Array.from({length:16},()=>Math.fround((random()-.5)*32));
 const p=Array.from({length:3},()=>Math.fround((random()-.5)*200));
 if(n<512){m.fill(0);m[0]=m[5]=m[10]=m[15]=1;p.splice(0,3,...[n%8,(n>>3)%8,(n>>6)%8].map(i=>[-1,-0,0,Number.MIN_VALUE,.5,1,1.0000001192092896,2][i]));}
 if(n%17===0)m[15]=0;
 [...m,...p].forEach((v,i)=>output.writeFloatLE(v,n*88+i*4));
 output.writeUInt32LE(n%13===0?0xffffffff:640,n*88+76);output.writeUInt32LE(n%11===0?0:480,n*88+80);output.writeUInt32LE(n%7?1:0,n*88+84);
}
fs.writeFileSync(process.argv[2],output,{flag:'wx'});
