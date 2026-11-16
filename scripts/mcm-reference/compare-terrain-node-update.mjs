import {propagateMcmTerrainBoundary} from '../../src/physics/mcm/terrain-patch-propagation.js';
import {propagateMcmTerrainVertex,rebuildMcmTerrainVertices} from '../../src/physics/mcm/terrain-vertex-propagation.js';
import fs from'node:fs';import{pathToFileURL}from'node:url';import{createMcmTerrainDetailTables}from'../../src/physics/mcm/terrain-detail-tables.js';import{updateMcmTerrainNode,resetMcmTerrainDetail}from'../../src/physics/mcm/terrain-node-update.js';
const BASE=0x21000000,bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
export function compareTerrainNodeUpdate(input,output,{metadata,realPatch=false}={}){
 if(!input.length||input.length%32)throw Error('Incomplete terrain node-update input');let cursor=0,differences=0,words=0;const examples=[],tables=createMcmTerrainDetailTables();
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4)),bytes=new ArrayBuffer(0x10000),view=new DataView(bytes),trace=[];
  const put=(p,v)=>view.setUint32(p-BASE,v>>>0,true),get=p=>view.getUint32(p-BASE,true),node=p=>new DataView(bytes,p-BASE,0x210),owner=p=>new DataView(bytes,p-BASE,0x600),bank=p=>new DataView(bytes,p-BASE,0x1654);
  for(let id=0;id<3;id++){
   const p=BASE+id*0x400,b=BASE+0x2000+id*0x1800;put(p+0x50,b);put(p+0x5c,BASE+0x8000);put(p+0x54,id?0:BASE+0x1000);put(p+0x58,id?BASE:0);put(p+0x184,(a[2]>>>id)&1);node(p).setUint8(0x181,(a[2]>>>(id+3))&1);
   put(p+0xc,bits(id*10));put(p+0x10,bits(.25));put(p+0x204,bits(1+id*.5));put(p+0x24,id+1);put(p+0x28,id*32);put(p+0x2c,-id*16);
   for(const[o,i,k]of[[0x188,3,7],[0x18c,4,11],[0x190,5,13],[0x194,6,17]])put(p+o,(a[i]+id*k)&65535);
   for(let v=0;v<289;v++){node(p).setUint8(0x60+v,[0,0x40,0x80,0xc0,1,2,0x81,0xc5][((a[0]+v+id)>>>0)%8]);bank(b).setUint8(v*16+1,(a[0]+v)&255);bank(b).setUint16(v*16+2,(a[0]+v*7)&65535,true);bank(b).setInt16(0x1410+v*2,(v*37)%289,true);}
   for(let v=0;v<256;v++)bank(b).setInt16(0x1210+v*2,Math.floor(v*289/255),true);
  }
  if(realPatch){put(BASE+0x20,1);put(BASE+0x428,0);put(BASE+0x42c,0);put(BASE+0x430,0);put(BASE+0x828,240);put(BASE+0x82c,240);put(BASE+0x830,255);}
  put(BASE+0x1000,BASE+0x400);put(BASE+0x13fc,BASE+0x800);
  for(const[o,v]of[[0x48,bits(a[0]%300-150)],[0x4c,bits(a[0]%100)],[0x50,bits(a[0]%200-100)],[0x60,bits(.5)],[0x88,a[7]],[0xb0,a[7]],[0xc0,a[0]],[0x548,a[7]]])put(BASE+0x8000+o,v);
  const env={node,owner,bank,u32:get,...tables,vertexRows:Array.from({length:17},(_,i)=>i*17),vertexCoordinates:v=>[v%17,Math.floor(v/17)],
   propagate(address,x,y,active){trace.push(1,address,x,y,active);put(BASE+0x80b4,get(BASE+0x80b4)+1);},
   rebuild(address){trace.push(2,address);put(BASE+0x807c,((address-BASE)/0x400)%2);put(BASE+0x80c0,get(BASE+0x80c0)+3);},
   optionalUpdate(address){trace.push(3,address);put(BASE+0x80c0,get(BASE+0x80c0)+7);},
  };
  if(metadata){
   if(metadata.length!==289*32)throw Error('Incomplete terrain vertex metadata');
   env.vertexMetadata=i=>Array.from({length:8},(_,j)=>metadata.readInt32LE(i*32+j*4));
   env.propagate=(...args)=>propagateMcmTerrainVertex(...args,env);
   env.rebuild=address=>rebuildMcmTerrainVertices(address,env);
   env.boundary=(...args)=>{trace.push(4,...args);put(BASE+0x80b4,get(BASE+0x80b4)+1);};
  }
  if(realPatch){env.rowOffsets=Array.from({length:17},(_,i)=>i*16);env.boundary=(...args)=>propagateMcmTerrainBoundary(...args,env);}
  (a[1]?resetMcmTerrainDetail:updateMcmTerrainNode)(BASE,env);
  if(cursor+4+3*0x210+0x600>output.length)throw Error('Incomplete terrain node-update output');
  const expectedTrace=output.readUInt32LE(cursor),actual=[trace.length];for(let id=0;id<3;id++)for(let o=0;o<0x210;o+=4)actual.push(get(BASE+id*0x400+o));for(let o=0;o<0x600;o+=4)actual.push(get(BASE+0x8000+o));actual.push(...trace);
  const count=1+(3*0x210+0x600)/4+expectedTrace;if(cursor+count*4>output.length)throw Error('Incomplete terrain node-update trace');
  for(let i=0;i<Math.max(count,actual.length);i++){const expected=i<count?output.readUInt32LE(cursor+i*4):null,value=i<actual.length?actual[i]>>>0:null;words++;if(value!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual:value,expected});}}
  cursor+=count*4;
 }
 if(cursor!==output.length)throw Error('Unexpected terrain node-update output');return{cases:input.length/32,words,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainNodeUpdate(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3]),process.argv[4]?{metadata:fs.readFileSync(process.argv[4]),realPatch:process.argv.includes('--real-patch')}:{}),null,2));
