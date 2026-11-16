import fs from 'node:fs';
let seed=0x47cac0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),f=Math.fround;
const output=Buffer.alloc(4096*176);
for(let n=0;n<4096;n++){
 const m=Array(16).fill(0);m[0]=m[5]=m[10]=m[15]=1;
 const points=[[-.1,.5,.5],[1.1,.5,.5],[.5,-.1,.5],[.5,1.1,.5],[.5,.5,-.1],[.5,.5,1.1],[.5,.5,.5],[-.1,-.1,-.1]];
 const rider=points[n%8],base=n%2?[.51,.51,.51]:points[(n>>3)%8];
 const values=[f((random()-.5)*4),f(random()*100),f((random()-.5)*8),f(n%3?random()*7-3:-16+(random()-.5)*6),f(random()*20),0,...base,...rider,...m,640,480,640,480,f((random()-.5)*6),n%2,n%3===0?6:2,(n>>4)%2,(n>>5)%2,0,0,1,0,1,0,f([.001,.016,.1,.5][n%4])];
 values.forEach((v,i)=>{if([28,29,30,31,33,34,35,36].includes(i))output.writeUInt32LE(v,n*176+i*4);else output.writeFloatLE(v,n*176+i*4);});
}
fs.writeFileSync(process.argv[2],output,{flag:'wx'});
