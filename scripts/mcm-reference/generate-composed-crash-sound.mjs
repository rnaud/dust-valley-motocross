import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('../../tests/fixtures/mcm/crash-sound-wine11.json.br',import.meta.url)))),input=Buffer.from(fixture.input,'base64'),rows=[];
for(let mode=0;mode<4;mode++)for(let i=0;i<input.length/0xf94;i++){
 const b=Buffer.alloc(0xfa0);input.copy(b,0,i*0xf94,(i+1)*0xf94);
 b.writeUInt32LE(mode&1,0xf94);b.writeUInt32LE(mode>>1,0xf98);b.writeUInt32LE(i%3?31:23,0xf9c);rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
