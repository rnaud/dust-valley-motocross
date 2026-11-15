import fs from 'node:fs';if(!process.argv[2])throw Error('Usage: generate-chase-post-smoothing.mjs NEW_INPUT.bin');const rows=[];
for(const previous of [0,1,2,3,4,5,6,7,999])for(let mode=0;mode<8;mode++)for(const actor of [0,1,2])for(const override of [0,1])for(const keep of [0,1]){
 const b=Buffer.alloc(164);[previous,mode,actor,override,keep].forEach((v,i)=>b.writeUInt32LE(v,i*4));for(let i=5;i<41;i++)b.writeFloatLE((i-20)*1.37+(previous-mode)*.13,i*4);rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
