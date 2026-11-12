// Generates a flat, asset-free TRN for original contact-probe regression capture.
import fs from 'node:fs';
const target=process.argv[2];if(!target)throw new Error('Output TRN path required');
const word=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;},scale=Buffer.alloc(4);scale.writeFloatLE(.01171875);
const samples=Buffer.alloc(4624);
for(let i=0;i<289;i++){samples.writeUInt16LE(100,i*16+2);samples.writeFloatLE(1,i*16+8);}
const prefix=Buffer.concat([Buffer.from('TRN\0'),word(2),word(0),word(3),scale,word(1),word(0),
  ...[Buffer.alloc(512),Buffer.alloc(580),samples].flatMap(b=>[word(b.length),word(b.length),b]),word(0),word(0)]);
const root=Buffer.alloc(60),leaf=Buffer.alloc(60),table=Buffer.alloc(1024);
root.writeFloatLE(1,4);root.writeUInt32LE(1,20);root.writeUInt32LE(12,24);root.writeUInt32LE(prefix.length+60,56);
leaf.writeFloatLE(1,4);leaf.writeUInt32LE(8,24);
for(let j=0;j<256;j++)table.writeUInt32LE(prefix.length+60+1024,j*4);
fs.writeFileSync(target,Buffer.concat([prefix,root,table,leaf]),{flag:'wx'});
