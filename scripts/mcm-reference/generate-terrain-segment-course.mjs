import fs from 'node:fs';
import {readMcmTerrain,decompressMcmBlock} from './terrain-data.mjs';
const [coursePath,captureReportPath,outputPath]=process.argv.slice(2);
if(!outputPath)throw new Error('Usage: node generate-terrain-segment-course.mjs course.trn capture-report.json input.bin');
const terrain=readMcmTerrain(fs.readFileSync(coursePath)),capture=JSON.parse(fs.readFileSync(captureReportPath));
const queries=[Buffer.concat([Buffer.from(capture.terrain.startHex,'hex'),Buffer.from(capture.environment.targetHex,'hex')])];
let seed=77127;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const append=(a,b)=>{const bytes=Buffer.alloc(24);[...a,...b].forEach((v,j)=>bytes.writeFloatLE(v,j*4));queries.push(bytes);};
for(let i=0;i<2000;i++){
 const a=[random()*13000-350,random()*400-100,random()*13000-350];
 const b=i%3===0?[a[0]+.1,a[1]-500,a[2]+.1]:[random()*13000-350,random()*400-100,random()*13000-350];append(a,b);
}
for(let i=0;i<100;i++)append([i*120,1000,4000],[i*120,-1000,4000]);
// Flat patch observed in the original course: exact plane endpoints exercise
// equality in the leaf's lower/upper height rejection before intersection.
for(const height of [100,-100]){
 append([100,height,100],[100.1,51.046875,100.1]);
 append([100,51.046875,100],[100.1,height,100.1]);
}
const header=Buffer.alloc(16);header.writeUInt32LE(terrain.banks.length);header.writeFloatLE(terrain.heightScale,4);header.writeFloatLE(terrain.worldToGrid,8);header.writeUInt32LE(terrain.rootOffset,12);
const count=Buffer.alloc(4);count.writeUInt32LE(queries.length);
fs.writeFileSync(outputPath,Buffer.concat([header,...terrain.banks.map(bank=>{const b=bank[2];return (b.compressed?decompressMcmBlock(b.data,b.size):b.data).subarray(0,b.size);}),count,...queries]));
