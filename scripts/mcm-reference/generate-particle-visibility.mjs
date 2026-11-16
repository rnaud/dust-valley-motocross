import fs from 'node:fs';const cases=[];
function make({x=320,y=240,z=.5,w=1,size=1,scale=8,width=640,height=480}={}){
 const b=Buffer.alloc(0x74,0xa5);b.writeFloatLE(size,0x1c);
 [x,y,z,w].forEach((n,j)=>b.writeFloatLE(n,0x48+j*4));b.writeFloatLE(scale,0x68);b.writeInt32LE(width,0x6c);b.writeInt32LE(height,0x70);cases.push(b);return b;
}
for(const x of [-100,-8,-.0001,0,320,640,648,700])for(const y of [-100,-8,0,240,480,488,600])for(const z of [-1,-0,0,.5,1,1.0001])make({x,y,z});
for(const offset of [0x1c,0x48,0x4c,0x50,0x54,0x68])for(const bits of [0x7fc00000,0xffc00000,0x7f800000,0xff800000,0,0x80000000,1,0x80000001])make().writeUInt32LE(bits,offset);
for(let i=0;i<512;i++)make({x:(i%2?1:-1)*(i*.113),y:240-i*.731,w:.001+i*.017,size:.013+i*.007,scale:1.1+i*.003,width:i%3?640:0,height:i%5?480:-1});
fs.writeFileSync(process.argv[2],Buffer.concat(cases));
