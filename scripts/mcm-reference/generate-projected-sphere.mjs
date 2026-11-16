import fs from'node:fs';
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0],out=Buffer.alloc(8192*128);
for(let n=0;n<8192;n++){
 const values=[random()-.5,random()-.5,random()+.5,random()*100,1,100+random()*300,random()*.1,random()*.1,random()*.1,random()*.1,...Array.from({length:16},()=>random()*2-1),...Array.from({length:3},()=>random()*100-50),random()*40];
 if(n<256){values.fill(0);values[2]=1;values[4]=1;values[5]=100;values[6]=1;values[10]=values[15]=.01;values[22]=values[23]=.5;values[25]=1;values[28]=[0,1,100,101][n%4];values[29]=[0,1,-1,10][(n>>2)%4];}
 values.forEach((v,i)=>out.writeUInt32LE(bits(v),n*128+i*4));out.writeUInt32LE(n%2,n*128+120);out.writeUInt32LE(0x1234,n*128+124);
}
fs.writeFileSync(process.argv[2],out,{flag:'wx'});
