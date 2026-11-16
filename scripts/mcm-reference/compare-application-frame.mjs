import {tickMcmApplication} from '../../src/physics/mcm/application-frame.js';
export function buildApplicationFrameCases(){
 const rows=[];
 const clocks=[[0,0],[0,900],[1,1],[1,17],[0xfffffff0,16],[1,0x80000000],[1,0x80000001],[0xffffffff,0],[1234,1200],[1,0xffffffff],[1,16777218],[1,33554434]];
 let seed=0x467f40;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let i=0;i<64;i++)clocks.push([random(),random()]);
 for(const [previous,current]of clocks)for(let flags=0;flags<128;flags++){
  const b=Buffer.alloc(32);[previous,current,flags&1,(flags>>1)&1,(flags>>2)&1,flags>>3,0xfedcba98,0x12345678].forEach((v,i)=>b.writeUInt32LE(v>>>0,i*4));rows.push(b);
 }
 return Buffer.concat(rows);
}
export function compareApplicationFrame(input,output){
 if(input.length%32||output.length!==input.length/32*80)throw Error('Invalid application-frame oracle sizes');
 const differences=[];
 for(let i=0;i<input.length/32;i++){
  const row=Array.from({length:8},(_,j)=>input.readUInt32LE(i*32+j*4));
  const mem=new Map(),app=0x1000,table=0x2000,alternate=0x2100,root=0x3000,rootTable=0x3100,owner=0x4000;
  const u32=a=>{if(!mem.has(a))throw Error(`Uninitialized read ${a.toString(16)}`);return mem.get(a);},put32=(a,v)=>mem.set(a,v>>>0);
  [[app,table],[app+8,owner],[app+0x10,row[2]],[app+0x318,row[3]],[app+0x430,root],[app+0x444,row[4]],[app+0x464,row[7]],[app+0x468,row[0]],[table+0x24,5],[table+0x2c,6],[alternate+0x2c,7],[root,rootTable],[rootTable+0x2c,4]].forEach(([a,v])=>put32(a,v));
  const result=Buffer.alloc(80);let events=0;
  const event=(tag,delta=0)=>{result.writeUInt32LE(tag,16+events*8);result.writeFloatLE(delta,20+events*8);events++;};
  const returned=tickMcmApplication(app,{u32,put32},{
   clock:()=>{event(1);return row[1];},
   input:(address,delta)=>{if(address!==row[2])throw Error('input receiver');event(2,delta);if(row[5]&1)put32(app+0x444,!u32(app+0x444));},
   optional:(address,delta)=>{if(address!==row[3])throw Error('optional receiver');event(3,delta);},
   virtual:(target,address,delta)=>{if(address!==(target===4?root:app))throw Error('virtual receiver');event(target,delta);if(target===4&&(row[5]&2))put32(app+0x464,row[6]);if(target===5&&(row[5]&4))put32(app,alternate);if(target===6&&(row[5]&8))put32(app+0x464,row[6]);},
   owner:address=>{if(address!==owner)throw Error('owner receiver');result.writeUInt32LE(1,64);result.writeUInt32LE(1,68);},
  });
  [returned,u32(app+0x464),u32(app+0x468),events].forEach((v,j)=>result.writeUInt32LE(v,j*4));result.writeUInt32LE(u32(app+0x444),72);result.writeUInt32LE(+(u32(app)!==table),76);
  for(let j=0;j<20;j++){const actual=result.readUInt32LE(j*4),expected=output.readUInt32LE(i*80+j*4);if(actual!==expected)differences.push({case:i,word:j,actual,expected});}
 }
 return {cases:input.length/32,comparedWords:input.length/32*20,differences};
}
