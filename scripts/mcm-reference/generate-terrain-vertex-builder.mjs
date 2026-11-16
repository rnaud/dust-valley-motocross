import fs from 'node:fs';
const count=2048,bytes=Buffer.alloc(count*96),f=new DataView(new ArrayBuffer(4));
const bits=x=>{f.setFloat32(0,x,true);return f.getUint32(0,true);};
let seed=0x85af31;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let i=0;i<count;i++){
 const generation=[0,1,2,0xfffffffe,0xffffffff][i%5],cache=[0,1,generation,0xffffffff][(i>>2)%4];
 const a=[i&1,generation,cache,i%289,i%9,i%17,Math.floor(i/17)%17,next(),next(),[0,1,4,16,31,32,255][i%7],bits((i%31)-15),bits([0,-0,1,-1,0.25,-0.25,2.3,-2.3][i%8]),i%10,(i>>3)&1,bits([1/16,0.1,-0.25,0,2][i%5]),bits((i%7)/3),bits((i%11)/7),next()&65535,bits((i%21-10)/7),bits((i%17-8)/9),bits((i%13-6)/5),0xa5a5a5a5,0,0];
 a.forEach((v,j)=>bytes.writeUInt32LE(v>>>0,i*96+j*4));
}
fs.writeFileSync(process.argv[2],bytes);
