import fs from 'node:fs';const kind=process.argv[2];if(!['source','base'].includes(kind)||!process.argv[3])throw Error('Usage: generate-chase-spatial.mjs source|base new-input.bin');let seed=kind==='source'?47107:47452;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[];
if(kind==='source')for(let k=0;k<64;k++)for(const speed of [-1,0,5-2**-21,5,5+2**-21,20])for(const flag of [0,1]){
 const b=Buffer.alloc(32),scale=10**((k%9)-4);for(let i=0;i<6;i++)b.writeFloatLE(k%8===0?0:(random()-.5)*scale,i*4);b.writeFloatLE(speed,24);b.writeUInt32LE(flag,28);rows.push(b);
}
else for(let k=0;k<96;k++)for(const delta of [0,-0,.02,Math.fround(.2)-2**-26,.2,.3,-.02,1])for(const previous of [0,1]){
 const b=Buffer.alloc(44);for(let i=0;i<11;i++)b.writeFloatLE((random()-.5)*(i<3?2e4:2e3),i*4);b.writeFloatLE(delta,24);b.writeUInt32LE(previous,28);rows.push(b);
}
fs.writeFileSync(process.argv[3],Buffer.concat(rows),{flag:'wx'});
