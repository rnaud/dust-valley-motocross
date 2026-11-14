import {queryMcmRiderTerrain} from '../../src/physics/mcm/rider-terrain-query.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const offsets=[0xfc,0x100,0x104,0x10c,0x110,0x118,0x11c,0x120,0x128,0x12c,0x134];
export function compareLiveRiderTerrainQuery(before,after,terrain){
 if(before.phase!=='before-query'||after.phase!=='after-query'||before.frame!==after.frame||before.rider!==after.rider||before.body!==after.body||before.terrain!==after.terrain||before.playerActive!==0||after.playerActive!==0||before.heightScaleBits!==floatBits(terrain.heightScale)||before.worldToGridBits!==floatBits(terrain.worldToGrid)||before.heightScaleBits!==after.heightScaleBits||before.worldToGridBits!==after.worldToGridBits)throw Error('Rider query capture boundary differs');
 const r=Buffer.from(before.riderHex,'hex'),out=Buffer.from(before.outputHex,'hex');
 if(r.length!==0x3ac||out.length!==36)throw Error('Wrong rider query allocation size');
 const vector=(b,o,n=3)=>Array.from({length:n},(_,i)=>b.readFloatLE(o+i*4)),nodes=new Map();
 for(const row of before.nodes){const bytes=Buffer.from(row.hex,'hex');if(bytes.length!==0x114||nodes.has(row.address))throw Error('Invalid rider query node');nodes.set(row.address,{bytes,address:row.address,local:vector(bytes,0x84,16),world:vector(bytes,0xc4,16),cacheValid:bytes.readUInt32LE(0x104),parentAddress:bytes.readUInt32LE(0x108)});}
 const get=address=>{const n=nodes.get(address);if(!n)throw Error('Uncaptured rider query transform');return n;};
 for(const n of nodes.values())n.parent=n.parentAddress?get(n.parentAddress):null;
 for(const n of nodes.values()){const seen=new Set();for(let p=n;p;p=p.parent){if(seen.has(p))throw Error('Cyclic rider query transform');seen.add(p);}}
 const rider={center:vector(r,0xa0),matrix:vector(r,0xb8,16),region:r.readUInt32LE(0x3a4)},output={point:vector(out,0),normal:vector(out,12),penetration:vector(out,24)};
 const hit=queryMcmRiderTerrain({rider,points:offsets.map(o=>get(r.readUInt32LE(o))),bodyNode:get(before.body),terrain,output});
 r.writeUInt32LE(rider.region>>>0,0x3a4);
 if(hit)[...output.point,...output.normal,...output.penetration].forEach((v,i)=>out.writeFloatLE(v,i*4));
 let comparedWords=1,changedWords=0;const differences=[];
 const compare=(name,initial,actual,recovered)=>{
  const a=Buffer.from(actual,'hex'),b=Buffer.from(initial,'hex');if(a.length!==recovered.length||b.length!==a.length)throw Error('Wrong rider query output size');
  for(let o=0;o<a.length;o+=4){comparedWords++;const original=a.readUInt32LE(o);if(original!==b.readUInt32LE(o))changedWords++;if(original!==recovered.readUInt32LE(o))differences.push({object:name,offset:o,original,recovered:recovered.readUInt32LE(o)});}
 };
 compare('rider',before.riderHex,after.riderHex,r);compare('outputs',before.outputHex,after.outputHex,out);
 if(after.nodes.length!==nodes.size)throw Error('Rider query node coverage differs');const seen=new Set();
 for(const record of after.nodes){if(seen.has(record.address))throw Error('Duplicate after-query node');seen.add(record.address);const n=get(record.address),b=Buffer.from(n.bytes);n.world.forEach((v,i)=>b.writeFloatLE(v,0xc4+i*4));b.writeUInt32LE(n.cacheValid,0x104);compare('node-'+record.address.toString(16),n.bytes.toString('hex'),record.hex,b);}
 if(hit!==after.result)differences.push({object:'return',original:after.result,recovered:hit});
 return {frame:before.frame,hit,region:rider.region,nodes:nodes.size,comparedWords,changedWords,differences};
}
