import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliCompressSync} from 'node:zlib';
import {readMcmTerrain} from './terrain-data.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
import {compareTerrainSegmentCourse} from './compare-terrain-segment-course.mjs';
const [executablePath,coursePath,inputPath,outputPath,samplesPath,prefix]=process.argv.slice(2);
if(!prefix)throw new Error('Usage: node build-terrain-segment-course-fixture.mjs mcm.exe course.trn input.bin output.bin samples.bin output-prefix');
const hash=b=>createHash('sha256').update(b).digest('hex');
const executableSha256=hash(fs.readFileSync(executablePath));
if(executableSha256!=='e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b')throw new Error('Unrecognized executable');
const course=fs.readFileSync(coursePath),terrain=readMcmTerrain(course),input=fs.readFileSync(inputPath),output=fs.readFileSync(outputPath),samples=fs.readFileSync(samplesPath);
if(output.readUInt32LE()!==terrain.nodes.size)throw new Error('Original node count mismatch');
let at=4,nodeWordComparisons=0;
for(let i=0;i<terrain.nodes.size;i++,at+=266*4){
 const offset=output.readUInt32LE(at),node=terrain.nodes.get(offset);if(!node)throw new Error('Unknown original node');
 const words=[offset,floatBits(node.bias),floatBits(node.scale),node.level,node.shift,node.bankIndex,node.minimumHeight>>>0,node.maximumHeight>>>0,node.originX>>>0,node.originY>>>0,...Array.from({length:256},(_,j)=>node.children?.[j]?.offset??0)];
 words.forEach((word,j)=>{if(output.readUInt32LE(at+j*4)!==word)throw new Error(`Original node field mismatch ${offset}:${j}`);nodeWordComparisons++;});
}
const queryAt=16+terrain.banks.length*4624,count=input.readUInt32LE(queryAt),queries=input.subarray(queryAt+4);
if(queries.length!==count*24||output.length-at!==count*20||samples.length%28)throw new Error('Invalid query/trace sizes');
const nodes=new Map([...terrain.nodes.values()].map(n=>[n.offset,{offset:n.offset,level:n.level,shift:n.shift,bias:n.bias,scale:n.scale,
 minimumHeight:n.minimumHeight,maximumHeight:n.maximumHeight,originX:n.originX,originY:n.originY,
 children:n.children?.map(c=>c?.offset??0),heights:{},adjacentHeights:{}}]));
for(let p=0;p<samples.length;p+=28){
 const offset=samples.readUInt32LE(p+4),base=samples.readUInt32LE(p+8),node=nodes.get(offset);
 if(!node)throw new Error('Unknown sampled node');
 for(let j=0;j<4;j++){
  const index=base+[0,1,17,18][j],value=samples.readUInt32LE(p+12+j*4),target=index<289?node.heights:node.adjacentHeights;
  if(index<289&&terrain.nodes.get(offset).heights[index]!==value)throw new Error('Original sample differs from course');
  if(target[index]!==undefined&&target[index]!==value)throw new Error('Observed sample changed between queries');target[index]=value;
 }
}
const fixture={schemaVersion:1,executableSha256,courseSha256:hash(course),inputSha256:hash(input),outputSha256:hash(output),samplesSha256:hash(samples),
 heightScale:terrain.heightScale,rootOffset:terrain.rootOffset,queriesHex:queries.toString('hex'),outputHex:output.subarray(at).toString('hex'),samplesHex:samples.toString('hex'),nodes:[...nodes.values()]};
let report=compareTerrainSegmentCourse(fixture);
const used=new Set(report.usedOffsets);fixture.nodes=fixture.nodes.filter(n=>used.has(n.offset));
report=compareTerrainSegmentCourse(fixture);delete report.usedOffsets;
report={scope:'Complete original terrain segment wrapper, cell splitting, recursive traversal and triangle intersection on dunes. Original tile deserialization uses host stdio/allocation adapters. Out-of-bank reads use explicitly observed adjacent allocation bytes from this isolated process, not assumed live-game memory. No whole-bike trajectory parity.',nodeWordComparisons,capturedNodes:fixture.nodes.length,...report};
fs.writeFileSync(prefix+'.json.br',brotliCompressSync(Buffer.from(JSON.stringify(fixture))));
fs.writeFileSync(prefix+'-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.differences.length||report.readDifferences)process.exitCode=1;
