// Deterministic original frame-tail branch cases; occlusion is disabled explicitly.
import fs from 'node:fs';
const [outputPath]=process.argv.slice(2);
if(!outputPath)throw new Error('Usage: node generate-frame-effects.mjs input.bin');
const cases=[];
for(let i=0;i<256;i++){
 const b=Buffer.alloc(0xcc8),e=Buffer.alloc(0x16c),m=Buffer.alloc(64),emit=Buffer.alloc(0x588),stack=Buffer.alloc(0xc00),flags=Buffer.alloc(12);
 for(let o=0;o<emit.length;o+=4)emit.writeFloatLE(o*.01+.5,o);
 const u=(o,v)=>b.writeUInt32LE(v>>>0,o),f=(o,v)=>b.writeFloatLE(v,o),sf=(o,v)=>stack.writeFloatLE(v,o),su=(o,v)=>stack.writeUInt32LE(v>>>0,o);
 for(const [o,v] of [[0xc90,i%23?1:0],[0x8c0,9],[0xca4,i%2],[0xcb4,+(i%11===0)],[0xcbc,(i>>2)%2],[0xcc0,+(i%7===0)],[0x844,+(i%13===0)],[0x4bc,+(i%17===0)]])u(o,v);
 f(0xcb8,[-1,0,.5,1,2][i%5]);f(0x6a4,[-5,0,21,22,23][(i>>2)%5]);f(0x560,[.1,.2,1][(i>>1)%3]);e.writeFloatLE([0,.5,1][i%3],0x160);
 [1,0,0,0,0,1,0,0,0,0,1,0,13,17,23,1].forEach((v,j)=>m.writeFloatLE(v,j*4));
 su(0x18,+(i%5===0));su(0x14,+(i%5===1));su(0x1c,+(i%5===2));su(0x30,+(i%5===3));
 sf(0x44,[0,.5,.95,1][(i>>1)%4]);sf(0x68,[0,.01,.1,.5,1][(i>>2)%5]);sf(0x48,50);sf(0x6c,[0,.1,1][(i>>3)%3]);sf(0x74,[-.1,0,.1][i%3]);sf(0xcc,.6);sf(0x134,.8);sf(0xc8,[.1,.2,.5][(i>>1)%3]);
 for(const o of [0x348,0x324,0x2a0,0x2c4])[1,2,3].forEach((v,j)=>sf(o+j*4,v+o*.01));
 flags.writeUInt32LE(i%19?1:0);flags.writeUInt32LE((i>>2)%2,4);flags.writeUInt32LE(i%3?0:3,8);
 cases.push(Buffer.concat([b,e,m,emit,stack,flags]));
}
fs.writeFileSync(outputPath,Buffer.concat(cases));
