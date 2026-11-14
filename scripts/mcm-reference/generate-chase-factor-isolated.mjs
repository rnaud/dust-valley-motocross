import fs from 'node:fs';let seed=476850;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[];
const f=Math.fround,near=2**-21;
for(const vy of [-5-near,-5,-5+near,-0,0,5-near,5,5+near])for(const denominator of [0,-0,-10,10])for(const verticalDenominator of [0,-0,-10,10])for(const gate of [0,1])for(const angle of [0,-0,f(Math.PI/2),2,-2]){
 const b=Buffer.alloc(180);for(let i=0;i<45;i++)b.writeFloatLE((random()-.5)*20,i*4);
 b.writeUInt32LE(0,44);b.writeUInt32LE(1,48);b.writeUInt32LE(1,52);b.writeUInt32LE(1,60);
 b.writeFloatLE(angle,104);b.writeFloatLE(rows.length%7===0?600:random()*30,108);b.writeFloatLE(-angle,116);b.writeUInt32LE(gate,132);
 b.writeFloatLE(vy,160);b.writeFloatLE(denominator,168);b.writeFloatLE(verticalDenominator,172);b.writeFloatLE([-1,0,1,2][rows.length%4],176);
 if(rows.length%13===0)for(let i=16;i<19;i++)b.writeFloatLE(0,i*4);
 rows.push(b);
}
if(!process.argv[2])throw Error('Usage: generate-chase-factor-isolated.mjs new-input.bin');fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
