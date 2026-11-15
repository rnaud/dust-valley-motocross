import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readMcmTerrain} from './terrain-data.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';

// Query points come from the failing recovered replay; expected results come
// exclusively from the isolated original terrain-course oracle, never JS output.
const [casesPath,resultsPath,coursePath,exePath,outputPath]=process.argv.slice(2);
if(!outputPath)throw Error('Usage: archive-scene-terrain-queries.mjs CASES_JSON RESULTS_BIN COURSE EXE OUTPUT_JSON');
const hash=b=>createHash('sha256').update(b).digest('hex');
const casesBytes=fs.readFileSync(casesPath),results=fs.readFileSync(resultsPath),course=fs.readFileSync(coursePath);
const executableSha256=hash(fs.readFileSync(exePath));
assert.equal(executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
const cases=JSON.parse(casesBytes),terrain=readMcmTerrain(course),nodeCount=results.readUInt32LE();
assert.equal(nodeCount,terrain.nodes.size);let offset=4;
for(let i=0;i<nodeCount;i++){
 const address=results.readUInt32LE(offset),node=terrain.nodes.get(address);assert.ok(node);
 const words=[address,floatBits(node.bias),floatBits(node.scale),node.level,node.shift,node.bankIndex,...Array.from({length:256},(_,j)=>node.children?.[j]?.offset||0)];
 words.forEach((word,j)=>assert.equal(results.readUInt32LE(offset+j*4),word,`node ${address} word ${j}`));offset+=262*4;
}
assert.equal(results.length,offset+cases.length*24,'Incomplete oracle results');
const queries=cases.map(({point},i)=>({point,expectedWords:Array.from({length:6},(_,j)=>results.readUInt32LE(offset+i*24+j*4))}));
const fixture={provenance:{executableSha256,courseSha256:hash(course),casesSha256:hash(casesBytes),resultsSha256:hash(results),oracleSourceSha256:hash(fs.readFileSync(new URL('./terrain-course-oracle.c',import.meta.url))),loaderSourceSha256:hash(fs.readFileSync(new URL('./oracle.c',import.meta.url))),sceneFixtureSha256:hash(fs.readFileSync(new URL('../../tests/fixtures/mcm/ai-frame-scene-wine11.json.br',import.meta.url))),scope:'Isolated original 0x48a2f0 node parse and 0x411340 height/smooth-normal queries on original Dunes banks. Query points are from the recovered failing scene replay, not independently observed native query arguments. Host allocation/stdio replace runtime services; renderer initialization is omitted. Does not prove complete frame parity.'},nodeCount,queries};
fs.writeFileSync(outputPath,JSON.stringify(fixture)+'\n');console.log({nodeCount,queries:queries.length});
