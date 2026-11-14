import fs from 'node:fs';
if(!process.argv[2])throw Error('Usage: generate-chase-controls.mjs NEW_INPUT');
 let seed=0x47b52a;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};const rows=[];
 for(let k=0;k<8192;k++){
  const a=Buffer.alloc(68),mode=[0,1,2,3,4,6,7][k%7];a.writeUInt32LE(mode,0);a.writeUInt32LE(k%17!==0?1:0,4);a.writeUInt32LE(k%2,8);
  [ [6.9,7,20,49.999996185302734,50,50.000003814697266,100,-1][k%8],(rnd()/2**32-.5)*4,(rnd()/2**32-.5)*8,109,[0,-0,.02,.2,-.02][k%5] ].forEach((v,i)=>a.writeFloatLE(v,(i+3)*4));
  a.writeUInt32LE(k%256,32);a.writeUInt32LE(k%3===0?0:1,36);a.writeUInt32LE(k%5===0?0:1,40);a.writeUInt32LE([0xffffffff,0xffff,0,9000,18000,27000,4500,12345][Math.floor(k/8)%8],44);
  a.writeUInt32LE((k>>4)%3,48);a.writeUInt32LE((k>>5)%3,52);a.writeUInt32LE(k%2,56);a.writeUInt32LE((k>>1)%2,60);a.writeUInt32LE(4,64);rows.push(a);
 }fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
