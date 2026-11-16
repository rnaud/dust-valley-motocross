import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {projectMcmSphere} from '../../src/physics/mcm/projected-sphere.js';
import {projectMcmBounds} from '../../src/physics/mcm/projected-bounds.js';
import {selectMcmTerrainNode} from '../../src/physics/mcm/terrain-node-select.js';
import {traverseMcmTerrain} from '../../src/physics/mcm/terrain-traversal.js';
const BASE=0x21000000,COUNT=25,slots=[0,1,15,16,17,51,85,119,136,153,204,238,239,240,254,255];
const bits=value=>new Uint32Array(Float32Array.of(value).buffer)[0];
export function compareTerrainTraversal(input,output,{realSelection=false,realBounds=false,realSphere=false}={}){
 if(!input.length||input.length%32)throw Error('Incomplete terrain traversal input');
 let cursor=0,differences=0,words=0;const examples=[];
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4));
  const bytes=new Uint8Array(0x20000),view=new DataView(bytes.buffer),trace=[];let projections=0;
  const put=(p,v)=>view.setUint32(p-BASE,v>>>0,true),get=p=>view.getUint32(p-BASE,true),node=p=>new DataView(bytes.buffer,p-BASE,0x210);
  for(let id=0;id<COUNT;id++){
   const p=BASE+id*0x400;for(let off=0;off<0x210;off+=4)put(p+off,a[1]^(Math.imul(id,0x1020304)+Math.imul(off,0x10101)));
   put(p+0x54,id<5?BASE+0x10000+id*0x400:0);put(p+0x58,id===0?0:id<17?BASE:BASE+(1+((id-17)>>1))*0x400);put(p+0x5c,BASE+0x18000);put(p+0x20,((a[1]+id)>>>0)%3);put(p+0x184,((a[1]+id)>>>0)%3?0x12345:0);node(p).setUint8(0x181,(a[7]&4)&&id%4===0?1:0);node(p).setUint8(0x182,0);
   for(let j=0;j<3;j++){put(p+0x1ec+j*4,bits(id*7+j*3-80));put(p+0x1f8+j*4,bits(j===1?20:8));}
  }
  if(realSelection){
   for(let id=0;id<COUNT;id++){
    const p=BASE+id*0x400;put(p,0x200d9b2c);put(p+0x34,id<5?1:0);put(p+0x1c,((a[0]+id)%4)*1000);put(p+0x1b4,(a[0]+id)%3);
    put(p+0x14,0);put(p+0x18,30);put(p+0x208,bits(1));put(p+0x1dc,bits(id*8-100));put(p+0x1e4,bits(id*8-84));put(p+0x1e0,bits(id*4-50));put(p+0x1e8,bits(id*4-34));
   }
   put(BASE+0x18048,bits(a[1]%300-150));put(BASE+0x1804c,bits(a[1]%100-20));put(BASE+0x18050,bits(a[1]%200-100));put(BASE+0x18054,a[0]%4);put(BASE+0x1805c,bits(.1));put(BASE+0x18090,a[1]);
  }
  for(let i=0;i<16;i++)put(BASE+0x10000+slots[i]*4,BASE+(i+1)*0x400);
  for(let i=0;i<4;i++){put(BASE+0x10400+i*0x400,BASE+(17+i*2)*0x400);put(BASE+0x10400+i*0x400+255*4,BASE+(18+i*2)*0x400);}
  const decision=k=>{switch(a[0]%6){case 0:return 0;case 1:return 2;case 2:return 1;case 3:return k%3;case 4:return k%5?1:0;default:return k%7===0?2:1;}};
  const env={node,u32:get,rowOffsets:Array.from({length:16},(_,i)=>i*16),childCount:256,boundsTests:a[1],sphereTests:(a[1]+1)>>>0,sphereEnabled:a[7]&1,
   projectSphere(address,transform,center,radius){trace.push(2,0x45678000,0x12345000,transform,...center.map(bits),radius,0);return decision(projections++)!==0;},
   select(address,resource,transform,recurse){trace.push(3,address,resource,transform,recurse);put(address+0x188,get(address+0x188)+1);if(a[7]&2)node(address).setUint8(0x181,((address-BASE)/0x400)%3===0?1:0);},
  };
  // See the explicit query-purpose parameter in the recovered traversal.
  env.projectBounds=(address,transform,center,extent,inside=true)=>{
   trace.push(1,0x45678000,0x12345000,transform,...center.map(bits),...extent.map(bits),0,inside?1:0);
   const d=decision(projections++);return{visible:d!==0,inside:d===2?8:d?3:0};
  };
  if(realSelection){
   env.owner=address=>new DataView(bytes.buffer,address-BASE,0x100);
   env.callVirtual=(method)=>{if(method!==0x200d9b40)throw Error('Unrecovered terrain virtual callback');}; // Original 4ba1a0 is ret 4.
   env.free=(address,pointer)=>{trace.push(4,address,pointer);put(BASE+0x18088,get(BASE+0x18088)+1);};
   env.select=(...args)=>selectMcmTerrainNode(...args,env);
  }
  let transform=0xabc100;
  if(realBounds){
   transform=BASE+0x1b000;env.sphereEnabled=0;
   const f=Math.fround,matrix=new Float32Array(16);
   matrix[0]=f(f(.002)*(1+a[0]));matrix[5]=f(f(.003)*(1+a[0]));matrix[10]=f(f(.004)*(1+a[0]));matrix[12]=f((a[1]%5)*.25);matrix[13]=matrix[14]=.5;matrix[15]=1;
   env.projectBounds=(address,transform,center,extent,wantCount)=>{const r=projectMcmBounds({matrix,center,extent,wantRect:false,wantCount});return{visible:r.accepted,inside:r.count};};
   if(realSphere){
    env.sphereEnabled=a[7]&1;
    const camera=new DataView(new ArrayBuffer(0x200));for(const[o,v]of[[0x98,1],[0xa8,100],[0x1a8,1],[0x1ac,1000],[0xf0,.02]])camera.setFloat32(o,v,true);
    for(let id=0;id<COUNT;id++)put(BASE+id*0x400+0x20c,bits(10));
    env.projectSphere=(address,transform,center,radius)=>projectMcmSphere({camera,matrix,center,radius:new Float32Array(Uint32Array.of(radius).buffer)[0]}).accepted;
   }
  }
  const result=traverseMcmTerrain(BASE,0xabc000,transform,[-12.25,3.5,18.75],[128,24,96],a[5],a[6],a[4],a[2],a[3],env);
  if(cursor+24+COUNT*0x210>output.length)throw Error('Incomplete terrain traversal output');
  const expectedTraceWords=output.readUInt32LE(cursor+12),actual=[result,env.boundsTests,env.sphereTests,trace.length,get(BASE+0x18090),get(BASE+0x18088)];
  for(let id=0;id<COUNT;id++)for(let off=0;off<0x210;off+=4)actual.push(get(BASE+id*0x400+off));actual.push(...trace);
  const expectedWords=6+COUNT*0x210/4+expectedTraceWords;
  if(cursor+expectedWords*4>output.length)throw Error('Incomplete terrain traversal trace');
  for(let i=0;i<Math.max(expectedWords,actual.length);i++){
   const expected=i<expectedWords?output.readUInt32LE(cursor+i*4):null,value=i<actual.length?actual[i]>>>0:null;words++;
   if(value!==expected){differences++;if(examples.length<16)examples.push({case:n,word:i,actual:value,expected});}
  }
  cursor+=expectedWords*4;
 }
 if(cursor!==output.length)throw Error('Unexpected terrain traversal trailing output');
 return{cases:input.length/32,words,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainTraversal(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3]),{realSelection:process.argv.includes('--real-selection'),realBounds:process.argv.includes('--real-bounds'),realSphere:process.argv.includes('--real-sphere')}),null,2));
