import fs from 'node:fs';if(!process.argv[2])throw Error('Usage: generate-camera-matrices.mjs NEW_INPUT.bin');
let seed=0x47a670;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[];
for(let i=0;i<4096;i++){
 const b=Buffer.alloc(60);for(let j=0;j<10;j++)b.writeFloatLE((rnd()-.5)*(j<3?5000:2),j*4);
 if(i%8===0)b.writeFloatLE(0,36);
 b.writeFloatLE([-90,0,.0001,1,45,85,109,179,180,270,360][i%11],40);
 b.writeFloatLE(.1+rnd(),44);b.writeFloatLE(1000+rnd()*1000,48);b.writeFloatLE([.75,1,4/3,16/9][i%4],52);b.writeUInt32LE([0,640,800,1280,1920,0xffffffff][i%6],56);rows.push(b);
}fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
