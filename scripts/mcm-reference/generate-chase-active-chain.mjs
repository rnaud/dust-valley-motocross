import fs from 'node:fs';let seed=47702;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),rows=[];
const bitsFloat=w=>new Float32Array(Uint32Array.of(w).buffer)[0];
for(let mode=0;mode<8;mode++)for(const actor of [0,1,3])for(let eyeGate=0;eyeGate<2;eyeGate++)for(let motionGate=0;motionGate<2;motionGate++)for(let reset=0;reset<2;reset++)for(let crashed=0;crashed<2;crashed++)for(const speed of [-1,Math.fround(.005),Math.fround(.006)])for(let geometry=0;geometry<3;geometry++){
 const b=Buffer.alloc(156);for(let i=0;i<39;i++)b.writeFloatLE((random()-.5)*10,i*4);
 b.writeUInt32LE(mode,44);b.writeUInt32LE(actor,48);b.writeUInt32LE(1,52);b.writeFloatLE(.02,56);b.writeUInt32LE(4,60);b.writeUInt32LE(geometry%2,88);
 if(geometry<2){b.writeFloatLE(0,108);for(let i=0;i<3;i++)b.writeFloatLE(bitsFloat(0x3f000000+0x10000*(i+3))+(geometry===0?.001*(i+1):.02),i*4);}
 b.writeUInt32LE(reset,124);b.writeFloatLE(speed,128);b.writeUInt32LE(eyeGate,132);b.writeUInt32LE(motionGate,136);b.writeUInt32LE(crashed,140);rows.push(b);
}
if(!process.argv[2])throw Error('Usage: generate-chase-active-chain.mjs new-input.bin');fs.writeFileSync(process.argv[2],Buffer.concat(rows),{flag:'wx'});
