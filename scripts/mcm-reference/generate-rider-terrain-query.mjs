import fs from 'node:fs';
const cases=[];
for(let i=0;i<176;i++){
 const r=Buffer.alloc(0x3ac),nodes=Buffer.alloc(12*0x114),settings=Buffer.alloc(16),samples=Buffer.alloc(289*16),output=Buffer.alloc(36);
 for(let o=0;o<r.length;o+=4)r.writeUInt32LE(0x12340000+o,o);
 const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,12,0,12,1];
 if(i%4===1){matrix[0]=0;matrix[2]=-1;matrix[8]=1;matrix[10]=0;}
 if(i%4===2){matrix[0]=.8;matrix[2]=-.6;matrix[8]=.6;matrix[10]=.8;}
 [0.1,-.2,.3].forEach((n,j)=>r.writeFloatLE(n,0xa0+j*4));
 matrix.forEach((n,j)=>r.writeFloatLE(n,0xb8+j*4));
 const centerY=i%8===0?20:i%8===1?-20:0;
 for(let j=0;j<12;j++){
  const local=[1,0,0,0,0,1,0,0,0,0,1,0,3+(j%3)*.2,centerY+(j===i%11?-1:1),4+(j%4)*.3,1];
  if(j===11)local.splice(12,3,3,0,4);
  for(let k=0;k<16;k++){nodes.writeFloatLE(local[k],j*0x114+0x84+k*4);nodes.writeFloatLE(local[k],j*0x114+0xc4+k*4);}
  nodes.writeUInt32LE(i%5?1:0,j*0x114+0x104);
 }
 [.01,.5,100,i%3===0?.7:1].forEach((v,j)=>settings.writeFloatLE(v,j*4));
 for(let j=0;j<289;j++){
  samples.writeUInt16LE(i%8===2?100:(i*3+j*7)%1000,j*16+2);
  [0,1,0].forEach((v,k)=>samples.writeFloatLE(v,j*16+4+k*4));
 }
 for(let j=0;j<9;j++)output.writeFloatLE(100+j,j*4);
 cases.push(Buffer.concat([r,nodes,settings,samples,output]));
}
fs.writeFileSync(process.argv[2],Buffer.concat(cases));
