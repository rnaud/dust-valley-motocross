import {queryMcmTerrainSegment} from '../../src/physics/mcm/terrain-segment.js';
import {traverseMcmTerrainSegment} from '../../src/physics/mcm/terrain-segment-traversal.js';

export function runTerrainSegmentCourse(fixture){
 const records=new Map(fixture.nodes.map(n=>[n.offset,n])),loaded=new Map(),reads=[];
 let query=0,adjacentReads=0;
 const resolve=offset=>{
  if(!offset)return null;if(loaded.has(offset))return loaded.get(offset);
  const record=records.get(offset);if(!record)throw new Error(`Unrecorded terrain node ${offset}`);
  const node={...record};loaded.set(offset,node);
  const read=(index,adjacent)=>{
   const value=(adjacent?record.adjacentHeights:record.heights)?.[index];
   if(value===undefined)throw new Error(`Unrecorded terrain sample ${offset}:${index}`);
   reads.push([query,offset,index,value]);if(adjacent)adjacentReads++;return value;
  };
  node.heights=new Proxy([],{get(_,key){if(key==='length')return 289;return read(Number(key),false);}});
  node.readHeight=index=>read(index,true);
  if(record.children)node.children=new Proxy(record.children,{get(target,key){if(key==='length')return target.length;return resolve(target[key]);}});
  return node;
 };
 const terrain={heightScale:fixture.heightScale,root:resolve(fixture.rootOffset)};
 const input=Buffer.from(fixture.queriesHex,'hex');if(input.length%24)throw new Error('Truncated segment queries');
 const output=Buffer.alloc(input.length/24*20);
 for(query=0;query<input.length/24;query++){
  const start=Array.from({length:3},(_,i)=>input.readFloatLE(query*24+i*4));
  const end=Array.from({length:3},(_,i)=>input.readFloatLE(query*24+12+i*4)),point=[71,-83,97],option={};
  const result=queryMcmTerrainSegment(terrain,start,end,point,option,traverseMcmTerrainSegment);
  output.writeUInt32LE(result,query*20);point.forEach((x,i)=>output.writeFloatLE(x,query*20+4+i*4));
  output.writeUInt32LE(option.node?.offset??0,query*20+16);
 }
 return {output,reads,adjacentReads,usedOffsets:[...loaded.keys()]};
}

export function compareTerrainSegmentCourse(fixture){
 const actual=runTerrainSegmentCourse(fixture),expected=Buffer.from(fixture.outputHex,'hex'),trace=Buffer.from(fixture.samplesHex,'hex');
 if(actual.output.length!==expected.length||trace.length%28)throw new Error('Invalid original query outputs');
 const differences=[];let hits=0;
 for(let i=0;i<expected.length;i+=4)if(actual.output.readUInt32LE(i)!==expected.readUInt32LE(i))differences.push({offset:i,actual:actual.output.readUInt32LE(i),expected:expected.readUInt32LE(i)});
 for(let i=0;i<expected.length;i+=20)hits+=expected.readUInt32LE(i);
 const expectedReads=[];
 for(let p=0;p<trace.length;p+=28)for(let j=0;j<4;j++)expectedReads.push([trace.readUInt32LE(p),trace.readUInt32LE(p+4),trace.readUInt32LE(p+8)+[0,1,17,18][j],trace.readUInt32LE(p+12+j*4)]);
 let readDifferences=Math.abs(actual.reads.length-expectedReads.length);
 for(let i=0;i<Math.min(actual.reads.length,expectedReads.length);i++)if(actual.reads[i].some((x,j)=>x!==expectedReads[i][j]))readDifferences++;
 return {queries:expected.length/20,hits,wordComparisons:expected.length/4,differences,
  heightReads:actual.reads.length,readDifferences,adjacentReads:actual.adjacentReads,usedOffsets:actual.usedOffsets};
}
