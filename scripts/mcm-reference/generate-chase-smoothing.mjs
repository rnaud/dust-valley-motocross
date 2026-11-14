import fs from 'node:fs';let seed=534871;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};const cases=[];
const deltas=[0,-0,.001,.02,.15,.3,.6,-.02],times=[.3,.1,1,0,-0,-.3];
for(let i=0;i<192;i++)cases.push({filters:Array.from({length:6},(_,j)=>[Math.fround((random()-.5)*6000),Math.fround(times[(i+j)%times.length]),-10,10]),targets:Array.from({length:6},()=>Math.fround((random()-.5)*6000)),delta:Math.fround(deltas[i%deltas.length]),steps:i<128?32:1});
const buffer=Buffer.alloc(cases.length*128);cases.forEach((c,n)=>{[...c.filters.flat(),...c.targets,c.delta].forEach((x,i)=>buffer.writeFloatLE(x,n*128+i*4));buffer.writeUInt32LE(c.steps,n*128+124);});
if(!process.argv[2])throw Error('Usage: generate-chase-smoothing.mjs new-input.bin');fs.writeFileSync(process.argv[2],buffer,{flag:'wx'});console.log(JSON.stringify({cases:cases.length,steps:cases.reduce((n,c)=>n+c.steps,0),seed:534871}));
