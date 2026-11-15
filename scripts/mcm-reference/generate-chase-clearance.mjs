import fs from 'node:fs';import {readMcmTerrain,decompressMcmBlock} from './terrain-data.mjs';import {queryMcmTerrainHeight} from '../../src/physics/mcm/terrain-height.js';
const [source,destination]=process.argv.slice(2);if(!destination)throw Error('Usage: generate-chase-clearance.mjs COURSE.trn NEW_INPUT.bin');
const t=readMcmTerrain(fs.readFileSync(source)),header=Buffer.alloc(16);header.writeUInt32LE(t.banks.length);header.writeFloatLE(t.heightScale,4);header.writeFloatLE(t.worldToGrid,8);header.writeUInt32LE(t.rootOffset,12);
let seed=4719;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[],scale=Math.fround(1/t.worldToGrid),extent=16**(t.root.level+1)*scale;
for(let i=0;i<4096;i++){
 const special=i%2===0,enabled=i%7?1:0;
 let x=Math.fround(random()*(special?256*scale:extent)),z=Math.fround(random()*(special?256*scale:extent));
 if(i%3===0)x=Math.fround([3,50,206,253][(i>>2)%4]*scale+[-.0001,0,.0001][(i>>4)%3]);
 if(i%5===0)z=Math.fround([3,50,206,253][(i>>3)%4]*scale+[-.0001,0,.0001][(i>>5)%3]);
 const point=special&&enabled?[Math.max(3*scale,Math.min(253*scale,x)),0,Math.max(3*scale,Math.min(253*scale,z))]:[x,0,z];
 const ground=queryMcmTerrainHeight({...t,point})[1];
 const y=[-20,0,60,90,120,200,400,ground+3.5-.0001,ground+3.5,ground+3.5+.0001][i%10];
 const b=Buffer.alloc(48);b.writeUInt32LE(special?3:1);b.writeUInt32LE(enabled,4);[scale,x,y,z,[-.7,-.01,-0,0,.01,.7][i%6],[7,11.72,30][i%3]].forEach((v,j)=>b.writeFloatLE(v,8+j*4));
 b.write(['Pyrmid01','Stddom01','excav01','dunes','pYrMiD01','other'][Math.floor(i/7)%6],32,'ascii');rows.push(b);
}
fs.writeFileSync(destination,Buffer.concat([header,...t.banks.map(bank=>{const b=bank[2];return (b.compressed?decompressMcmBlock(b.data,b.size):b.data).subarray(0,b.size);}),...rows]),{flag:'wx'});
