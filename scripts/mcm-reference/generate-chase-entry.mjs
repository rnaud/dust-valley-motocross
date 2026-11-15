import fs from 'node:fs';
if(!process.argv[2])throw Error('Usage: generate-chase-entry.mjs new-input.bin');
const rows=[],yaw=[-3,-2-2**-22,-2,-2+2**-23,-0,0,2-2**-23,2,2+2**-22,3],zoom=[-109,-1,-0,0,1,54.5,109,218];
for(let mode=0;mode<8;mode++)for(const flag of [0,1])for(const crash of [0,1])for(const angle of yaw)for(const value of zoom){
 const a=Buffer.alloc(40);[mode,flag,crash].forEach((v,i)=>a.writeUInt32LE(v,i*4));[20,.25,angle,30,-.75,-angle,value].forEach((v,i)=>a.writeFloatLE(v,(i+3)*4));rows.push(a);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
