import fs from 'node:fs';const rows=[];let seed=1;const rand=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let i=0;i<768;i++){
 const b=Buffer.alloc(0x3ec),u=(o,x)=>b.writeUInt32LE(x>>>0,o),f=(o,x)=>b.writeFloatLE(x,o);u(0,i%9);u(0x3e4,i%9+(i%3)*5);u(0x3e8,i%2?0x115c:0);u(4,[0,128,256,384][i%4]);u(8,rand());f(12,[0,10,100][i%3]);f(16,[100,10,0][(i>>2)%3]);[.3,.7,.9,3].forEach((v,j)=>f(0x14+j*4,v));
 for(let j=0;j<32;j++)u(0x24+j*4,rand());
 for(let j=0;j<8;j++){const p=0xa4+j*72,q=0x2e4+j*32;for(let o=0;o<72;o+=4)u(p+o,rand());for(let o=0;o<32;o+=4)u(q+o,rand());[0,4,8].forEach(o=>f(p+o,((rand()%10000)-5000)/100));u(p+0xc,rand());u(p+0x10,j%4);f(p+0x14,[0,.5,1,2,Infinity,NaN][(i+j)%6]);f(p+0x18,[0,1,2][(i+j)%3]);u(p+0x34,(i+j)%4);f(q+8,[0,.1,.5,1,NaN][(i+j)%5]);}rows.push(b);
}
fs.writeFileSync(process.argv[2],Buffer.concat(rows));
