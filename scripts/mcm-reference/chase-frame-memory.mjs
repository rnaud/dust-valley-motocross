import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
// Read native addresses into the existing chase assertion format. Stack locals
// have no representation here: frame evolution must derive them itself.
export function readChaseFrameMemory(memory,camera){
 const {u32}=memory,words=(a,n)=>Array.from({length:n},(_,i)=>u32(a+i*4));
 const app=u32(0x4e4fb4),owner=u32(camera+0x1c),bike=u32(camera+0x1ec),terrain=u32(camera+0x1f0),rider=u32(bike+0x874),root=u32(bike+0x434),renderRider=u32(bike+0xc8c),renderRoot=u32(renderRider+0x434);
 const devices=u32(app+0x10),keyboard=u32(devices+0x24),joystick=u32(devices+0xc),inputs=Array(102).fill(0);
 const put=(i,a,n=1)=>inputs.splice(i,n,...words(a,n));
 for(const [i,o,n]of [[10,0x1d4,1],[11,0x1f4,1],[23,0x1d8,1],[24,0x1cc,1],[26,0x1e0,1],[27,0x1e8,1],[28,0x20c,1],[33,0x23c,3],[49,0x200,1],[61,0x204,1],[63,0x13c,1],[72,0x208,1],[73,0x24c,1],[74,0x238,1],[75,0x1f8,1],[78,0x250,1],[88,0x140,1],[90,0x13c,1],[91,0x28,1],[93,0x228,1],[98,0x1a8,2],[100,0x170,1],[101,0x180,1]])put(i,camera+o,n);
 for(const [i,o,n]of [[17,0x4ec,1],[18,0x4dc,1],[29,0x560,1],[32,0x844,1],[36,0x510,3],[39,0x5ec,1],[40,0x6a4,1],[42,0x6b0,1],[43,0xbfc,1],[45,0x8b4,1],[54,0x4c0,3],[57,0x620,1],[86,0x4e8,1],[87,0x4d8,1]])put(i,bike+o,n);
 put(12,terrain+0x954);put(20,0x51edb0,3);put(44,app+0x314);put(46,rider+0x144);put(47,rider+0x170);put(48,rider+0x140);put(50,app+0xe40,4);put(58,root+0xb4,3);
 inputs[62]=u32(owner+0x2c)===camera?1:0;
 const keys=[0x48,0x50,0x4b,0x4d,0x4a,0x0c,0x4e,0x0d];
 keys.forEach((key,i)=>{if(u32(keyboard+0x288+key*20)===1)inputs[64]|=1<<i;});
 inputs[65]=joystick?1:0;
 if(joystick){put(66,joystick+0x594);put(67,joystick+0x584);put(68,joystick+0x2a0+2*20);put(69,joystick+0x2a0+3*20);}
 put(70,keyboard+0x4cc);put(71,keyboard+0xecc);inputs[76]=u32(app+0x1072)&0xffff;put(77,app+0x724);put(79,app+0x117f,4);put(83,terrain+0x44);put(84,terrain+0x40);put(85,terrain+0xa04);put(89,owner+0x38);inputs[92]=u32(camera+0x1b0)&255;put(94,inputs[93],4);
 const pointers=words(camera+0x210,6);
 const float=a=>new Float32Array(Uint32Array.of(u32(a)).buffer)[0];
 const alternate={height:float(camera+0x248),width:u32(camera+0x180),screenHeight:u32(camera+0x184),boundWidth:u32(camera+0x1b4),boundHeight:u32(camera+0x1b8),bike890:float(bike+0x890),bike8a4:u32(bike+0x8a4),rider13c:u32(rider+0x13c)};
 return {camera,alternate,inputs,pointers,filters:pointers.flatMap(a=>words(a,4)),result:[...words(camera+0x22c,3),...words(camera+0x144,3)],cameraPose:[...words(camera+0x144,10),...words(camera+0x1c4,2),u32(camera+0x1bc)],nodeVisibility:[root,renderRoot].flatMap(a=>[u32(a+0x12c),...words(a+0x240,8)]),matrices:[...words(camera+0x30,64),u32(camera+0x16c)]};
}
export function decodeChaseFrameMemory(row){
 const blocks=row.blocks.map(b=>({...b,bytes:CapturedBytes.from(b.hex,'hex')}));
 for(const b of blocks)if(b.size!==b.bytes.length)throw Error('Invalid chase memory block');
 const u32=address=>{
  const matches=blocks.filter(b=>address>=b.address&&address+4<=b.address+b.size);
  if(!matches.length)throw Error(`Missing chase memory at 0x${address.toString(16)}`);
  const value=matches[0].bytes.readUInt32LE(address-matches[0].address);
  if(matches.some(b=>b.bytes.readUInt32LE(address-b.address)!==value))throw Error('Chase memory overlap differs');
  return value;
 };
 return {phase:row.phase,frame:row.frame,deltaBits:row.deltaBits,...readChaseFrameMemory({u32},row.camera)};
}
