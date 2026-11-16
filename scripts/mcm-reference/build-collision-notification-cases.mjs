import fs from 'node:fs';
const cases=[];
for(let i=0;i<1536;i++){
 const camera=[17,33,-29],d=[-301,-300,-299.99,-150,0,1,149.99,299.99,300,301];
 cases.push({seed:(Math.imul(i,1664525)+1013904223)>>>0,playingMask:i%64,impulse:Math.fround([-1,0,.1,1,99.99,100,100.01,1000][i%8]),type:i%5-1,selected:i%7!==0,crash:i%11===0?1:0,currentIndex:i%6,lengths:[0,1,17,44100,0xffffffff,0x80000001],position:[Math.fround(camera[0]+d[Math.floor(i/5)%d.length]),i*100,Math.fround(camera[2]+d[Math.floor(i/50)%d.length])],camera});
}
const bytes=Buffer.alloc(4+cases.length*76);bytes.writeUInt32LE(cases.length);
cases.forEach((c,i)=>{const o=4+i*76;[c.seed,c.playingMask,0,c.type>>>0,+c.selected,c.crash,c.currentIndex,...c.lengths].forEach((v,j)=>bytes.writeUInt32LE(v,o+j*4));bytes.writeFloatLE(c.impulse,o+8);[...c.position,...c.camera].forEach((v,j)=>bytes.writeFloatLE(v,o+(13+j)*4));});
fs.writeFileSync(process.argv[2],bytes);fs.writeFileSync(process.argv[3],JSON.stringify(cases));
