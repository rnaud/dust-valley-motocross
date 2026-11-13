import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {readMcmTerrain,decompressMcmBlock} from './terrain-data.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
const hash=b=>createHash('sha256').update(b).digest('hex');

export function compareLiveTerrain(terrain,{prefix,banks,tree}){
 if(prefix.length!==0xa08||!tree.length||tree.length%1048)throw Error('Truncated terrain observation');
 if(prefix.readUInt32LE(0x9f8)!==terrain.banks.length)throw Error('Live bank count differs');
 const expected=Buffer.concat(terrain.banks.flatMap(bank=>bank.map(b=>(b.compressed?decompressMcmBlock(b.data,b.size):b.data).subarray(0,b.size))));
 if(banks.length!==expected.length)throw Error('Truncated terrain banks');
 let byteDifferences=0;for(let i=0;i<banks.length;i++)if(banks[i]!==expected[i])byteDifferences++;
 const nodes=new Map();
 for(let p=0;p<tree.length;p+=1048){const words=Array.from({length:262},(_,i)=>tree.readUInt32LE(p+i*4));if(!words[0]||nodes.has(words[0]))throw Error('Duplicate or null node address');nodes.set(words[0],words);}
 const visited=new Map(),reverse=new Map(),firstNodeDifferences=[];let nodeDifferences=0;
 function visit(address,node){
  if(!address&&!node)return;
  if(!address||!node)throw Error('Missing terrain child');
  if(visited.has(address)){if(visited.get(address)!==node.offset)throw Error('Terrain alias mismatch');return;}
  if(reverse.has(node.offset)&&reverse.get(node.offset)!==address)throw Error('Terrain alias mismatch');
  visited.set(address,node.offset);reverse.set(node.offset,address);
  const actual=nodes.get(address);if(!actual)throw Error('Missing terrain node');
  const values=[floatBits(node.bias),floatBits(node.scale),node.level,node.shift,node.bankIndex];
  for(let i=0;i<values.length;i++)if(actual[i+1]!==values[i]){
   nodeDifferences++;if(firstNodeDifferences.length<10)firstNodeDifferences.push({address,offset:node.offset,field:i,actual:actual[i+1],expected:values[i]});
  }
  for(let i=0;i<256;i++)visit(actual[i+6],node.children?.[i]);
 }
 visit(prefix.readUInt32LE(0x44),terrain.root);
 if(visited.size!==nodes.size||visited.size!==terrain.nodes.size)throw Error('Unreachable or missing terrain nodes');
 const scaleDifferences=+(prefix.readUInt32LE(0x40)!==floatBits(terrain.heightScale)) + +(prefix.readUInt32LE(0xa04)!==floatBits(terrain.worldToGrid));
 return {scope:'Live static terrain bank payloads, scales and physics hierarchy versus recovered course loader. Not chassis trajectory parity.',
  banks:terrain.banks.length,bytes:banks.length,byteDifferences,bankSha256:hash(banks),decodedBankSha256:hash(expected),
  nodes:nodes.size,nodeDifferences,firstNodeDifferences,scaleDifferences,heightScale:terrain.heightScale,worldToGrid:terrain.worldToGrid,
  prefixSha256:hash(prefix),treeSha256:hash(tree)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==6)throw Error('Usage: compare-live-terrain.mjs course.trn prefix.bin banks.bin tree.bin');
 const [coursePath,...paths]=process.argv.slice(2),bytes=fs.readFileSync(coursePath),[prefix,banks,tree]=paths.map(p=>fs.readFileSync(p));
 const report={schemaVersion:1,courseSha256:hash(bytes),...compareLiveTerrain(readMcmTerrain(bytes),{prefix,banks,tree})};
 console.log(JSON.stringify(report,null,2));if(report.byteDifferences||report.nodeDifferences||report.scaleDifferences)process.exitCode=1;
}
