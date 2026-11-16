import fs from'node:fs';import{pathToFileURL}from'node:url';import{prepareMcmTerrain}from'../../src/physics/mcm/terrain-prepare.js';
export function compareTerrainPrepare(input,output){
 const stride=0x9f4+4+256,base=0x21000000;
 if(!input.length||input.length%32||output.length!==input.length/32*stride)throw Error('Incomplete terrain preparation cases');let differences=0;const examples=[];
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4)),bytes=Buffer.alloc(0x9f4),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.length),trace=[],globals=new Map([[0x4e4fb4,base+0x3000],[base+0x32e4,0],[0x4ee04c,0xffffffff],[0x4ee050,0xffffffff]]);let clocks=0;
  for(const[o,v]of[[0x3c,0x12345678],[0x44,base+0x1000],[0x54,a[1]],[0x7c,a[2]],[0xc0,a[6]]])view.setUint32(o,v,true);view.setFloat32(0x40,.01171875,true);
  prepareMcmTerrain(base,view,base+0x2000,{position:[12,34,-5],fov:85,width:640},a[0],{u32:p=>{if(!globals.has(p))throw Error('Missing prepare memory');return globals.get(p);},put32:(p,v)=>globals.set(p,v)},
   {clock(){trace.push(1,clocks);return(a[3]+Math.imul(clocks++,a[4]))>>>0;},traverse(...args){trace.push(2,...args);if(a[5]){view.setUint32(0xc0,123,true);view.setUint32(0x44,base+0x1800,true);}},update(p,changed){trace.push(3,p,Number(changed));if(a[5])view.setUint32(0x7c,Number(!a[2]),true);},optionalFirst(p){trace.push(4,p);if(a[5])view.setUint32(0x44,base+0x1000,true);},optionalSecond(p){trace.push(5,p);},emit(...args){trace.push(6,...args);}});
  if(globals.get(0x4ee04c)!==0||globals.get(0x4ee050)!==0)throw Error('Missing global resets');
  const actual=[...Array.from({length:bytes.length/4},(_,i)=>bytes.readUInt32LE(i*4)),trace.length,...trace,...Array(64-trace.length).fill(0)];
  actual.forEach((v,i)=>{const expected=output.readUInt32LE(n*stride+i*4);if(v!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual:v,expected});}});
 }
 return{cases:input.length/32,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainPrepare(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
