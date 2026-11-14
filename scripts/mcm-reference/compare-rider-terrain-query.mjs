import {queryMcmRiderTerrain} from '../../src/physics/mcm/rider-terrain-query.js';
export function compareRiderTerrainQuery(input,output){
 const inputSize=0x3ac+12*0x114+16+289*16+36,outputSize=2*0x3ac+12*0x114+40;
 if(input.length%inputSize||output.length!==input.length/inputSize*outputSize)throw Error('Wrong rider query oracle sizes');
 const differences=[],regions=new Set();let hits=0,comparedWords=0,changedWords=0;
 for(let i=0;i<input.length/inputSize;i++){
  const source=input.subarray(i*inputSize,(i+1)*inputSize),native=output.subarray(i*outputSize,(i+1)*outputSize),before=native.subarray(0,0x3ac),actual=native.subarray(0x3ac);
  const recovered=Buffer.concat([before,source.subarray(0x3ac,0x3ac+12*0x114),source.subarray(inputSize-36),Buffer.alloc(4)]),initial=Buffer.from(recovered);
  const vector=(b,o,n=3)=>Array.from({length:n},(_,j)=>b.readFloatLE(o+j*4));
  const nodes=Array.from({length:12},(_,j)=>{const o=0x3ac+j*0x114;return {local:vector(source,o+0x84,16),world:vector(source,o+0xc4,16),cacheValid:source.readUInt32LE(o+0x104),parent:null};});
  const s=0x3ac+12*0x114,samples=s+16;
  const root={level:0,bias:source.readFloatLE(s+8),scale:source.readFloatLE(s+12),heights:Array.from({length:289},(_,j)=>source.readUInt16LE(samples+j*16+2)),normals:Array.from({length:289},(_,j)=>vector(source,samples+j*16+4))};
  const terrain={root,heightScale:source.readFloatLE(s),worldToGrid:source.readFloatLE(s+4)},rider={center:vector(before,0xa0),matrix:vector(before,0xb8,16),region:before.readUInt32LE(0x3a4)};
  const result={point:vector(source,inputSize-36),normal:vector(source,inputSize-24),penetration:vector(source,inputSize-12)};
  const hit=queryMcmRiderTerrain({rider,points:nodes.slice(0,11),bodyNode:nodes[11],terrain,output:result});hits+=hit;if(hit)regions.add(rider.region);
  recovered.writeUInt32LE(rider.region>>>0,0x3a4);
  nodes.forEach((node,j)=>{const o=0x3ac+j*0x114;node.world.forEach((v,k)=>recovered.writeFloatLE(v,o+0xc4+k*4));recovered.writeUInt32LE(node.cacheValid,o+0x104);});
  [...result.point,...result.normal,...result.penetration].forEach((v,j)=>recovered.writeFloatLE(v,recovered.length-40+j*4));recovered.writeUInt32LE(hit,recovered.length-4);
  for(let o=0;o<actual.length;o+=4){comparedWords++;if(initial.readUInt32LE(o)!==actual.readUInt32LE(o))changedWords++;if(recovered.readUInt32LE(o)!==actual.readUInt32LE(o))differences.push({case:i,offset:o,original:actual.readUInt32LE(o),recovered:recovered.readUInt32LE(o)});}
 }
 return {cases:input.length/inputSize,hits,regions:[...regions].sort(),comparedWords,changedWords,differences};
}
