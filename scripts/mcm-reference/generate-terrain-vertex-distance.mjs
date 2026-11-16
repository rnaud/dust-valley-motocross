import fs from'node:fs';let seed=314159;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;},bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0],out=Buffer.alloc(8192*64);
for(let n=0;n<8192;n++){
 const a=[random(),random(),random()%40,random()%17,random()%17,random()&65535,random()&65535,bits((random()%10000)-5000),bits((random()%1024)/256),bits((random()%2048)/512),bits((random()%10000)-5000),bits((random()%10000)-5000),bits((random()%10000)-5000),bits((random()%4096)/1024),random(),random()&255];
 if(n%3===0){a[0]=random()%256;a[1]=random()%256;a[2]%=6;}if(n%7===0)a[9]=0;if(n%11===0)a[13]=0;
 a.forEach((v,i)=>out.writeUInt32LE(v,n*64+i*4));
}fs.writeFileSync(process.argv[2],out,{flag:'wx'});
