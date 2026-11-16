import fs from 'node:fs';
const cases=[];
for(let i=0;i<512;i++)cases.push({seed:(Math.imul(i,1664525)+1013904223)>>>0,playingMask:i%64,impulse:Math.fround([-1,0,.1,1,99.99,100,100.01,1000][Math.floor(i/64)]),volume:i%3===0?-1:-2500+i,lengths:[0,1,17,44100,0xffffffff,0x80000001]});
const bytes=Buffer.alloc(4+cases.length*40);bytes.writeUInt32LE(cases.length);
cases.forEach((c,i)=>{const o=4+i*40;bytes.writeUInt32LE(c.seed,o);bytes.writeUInt32LE(c.playingMask,o+4);bytes.writeFloatLE(c.impulse,o+8);bytes.writeInt32LE(c.volume,o+12);c.lengths.forEach((v,j)=>bytes.writeUInt32LE(v,o+16+j*4));});
fs.writeFileSync(process.argv[2],bytes);fs.writeFileSync(process.argv[3],JSON.stringify(cases));
