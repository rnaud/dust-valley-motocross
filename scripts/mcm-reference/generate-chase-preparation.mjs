import fs from 'node:fs';let seed=72613;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};const rows=[];
for(let repeat=0;repeat<5;repeat++)for(let mode=0;mode<8;mode++)for(let actorType=0;actorType<4;actorType++)for(let initialized=0;initialized<2;initialized++)rows.push({values:Array.from({length:11},(_,i)=>Math.fround((random()-.5)*(i<9?6000:3))),mode,actorType,initialized,delta:[0,.02,.15,.3,.6][repeat],steps:repeat<3?16:1});
const base=process.argv[2];if(!base)throw Error('Usage: generate-chase-preparation.mjs new-output-prefix');
const isolated=Buffer.alloc(rows.length*56),joined=Buffer.alloc(rows.length*64);
rows.forEach((r,n)=>{r.values.forEach((v,i)=>isolated.writeFloatLE(v,n*56+i*4));[r.mode,r.actorType,r.initialized].forEach((v,i)=>isolated.writeUInt32LE(v,n*56+44+i*4));isolated.copy(joined,n*64,n*56,n*56+56);joined.writeFloatLE(r.delta,n*64+56);joined.writeUInt32LE(r.steps,n*64+60);});
fs.writeFileSync(base+'-input.bin',isolated,{flag:'wx'});fs.writeFileSync(base+'-joined-input.bin',joined,{flag:'wx'});console.log(JSON.stringify({cases:rows.length,joinedSteps:rows.reduce((n,r)=>n+r.steps,0),seed:72613}));
