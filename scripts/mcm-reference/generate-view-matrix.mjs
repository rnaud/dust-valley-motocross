import fs from 'node:fs';
// Fixed seed; finite directions with representable squared length. These cases
// validate the expression, not the original camera controller's state history.
let seed=493719;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const rows=[];
for(let i=0;i<180;i++)rows.push([...Array.from({length:3},()=>Math.fround((random()-.5)*6000)),...Array.from({length:6},()=>Math.fround((random()-.5)*10)),i<60?0:Math.fround((random()-.5)*6)]);
rows.push([0,0,0,0,0,1,0,1,0,0],[0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,1,0,0,0,0]);
for(let i=0;i<800;i++){
 const scale=10**((i%25)-12),roll=[0,-0,Math.PI,-Math.PI,1e6,-1e6,1e12,-1e12][i%8];
 rows.push([...Array.from({length:3},()=>Math.fround((random()-.5)*1e6)),...Array.from({length:6},()=>Math.fround((random()-.5)*scale)),Math.fround(roll)]);
}
for(const roll of [0,-0,1,-1])rows.push([1,-2,3,1,0,0,1,0,0,roll],[0,0,0,0,0,0,0,0,0,roll]);
const output=process.argv[2];if(!output)throw Error('Usage: generate-view-matrix.mjs new-input.bin');
fs.writeFileSync(output,Buffer.from(Float32Array.from(rows.flat()).buffer),{flag:'wx'});
console.log(JSON.stringify({cases:rows.length,inputBytes:rows.length*40,seed:493719}));
