import fs from 'node:fs';const rows=[];
function make(x,z,y=0){const b=Buffer.alloc(32);[0,0,0,x,y,z].forEach((v,i)=>b.writeFloatLE(v,i*4));b.writeInt32LE(-123,24);b.writeInt32LE(1234,28);rows.push(b);return b;}
for(const x of [-301,-300,-299.999,-212.13,-1,-0,0,.001,1,212.13,299.999,300,301])for(const z of [-301,-300,-1,0,1,299.999,300,301])make(x,z,1000);
for(let i=0;i<512;i++)make((i-256)*1.171,(i%91-45)*6.61,i*7);
for(const word of [0x7fc00000,0xffc00000,0x7f800000,0xff800000,0x7f7fffff,0xff7fffff,1,0x80000001])for(const offset of [0,4,8,12,16,20])make(2,3).writeUInt32LE(word,offset);
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
