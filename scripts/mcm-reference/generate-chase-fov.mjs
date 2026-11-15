import fs from 'node:fs';
if(!process.argv[2])throw Error('Usage: generate-chase-fov.mjs NEW_INPUT.bin');
let seed=0x47db8f;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[];
for(let i=0;i<4096;i++){
 const b=Buffer.alloc(44),time=[.25,.3,1,.02][i%4],dt=[0,.01,.02,.25,.3,1,-.01,time][(i>>2)%8];
 const value=i%8===0?0:random()*150-20,target=i%8===0?0:random()*150-20;
 [value,time,random()*200,-random()*20,target,dt,109].forEach((v,j)=>b.writeFloatLE(v,j*4));
 [[7,[0,1,2,0xfffffffe,0xffffffff][i%5]],[8,123],[9,(i>>5)%2],[10,i%256]].forEach(([j,v])=>b.writeUInt32LE(v,j*4));rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
