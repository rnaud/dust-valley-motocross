import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareTerrainSegmentCourse,runTerrainSegmentCourse} from '../scripts/mcm-reference/compare-terrain-segment-course.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/terrain-segment-course-wine11.json.br',import.meta.url))));

test('complete terrain segment queries match original hits, points, nodes and ordered height reads',()=>{
 const f=fixture(),r=compareTerrainSegmentCourse(f);
 assert.equal(r.queries,2105);assert.equal(r.hits,228);assert.equal(r.wordComparisons,10525);
 assert.deepEqual(r.differences,[]);assert.equal(r.heightReads,14252);assert.equal(r.readDifferences,0);assert.equal(r.adjacentReads,33);
 assert.equal(Buffer.from(f.outputHex,'hex').readUInt32LE(),0,'captured live effects query is a miss');
});

test('terrain traversal rejects missing adjacent memory instead of fabricating boundary samples',()=>{
 const f=fixture();for(const n of f.nodes)n.adjacentHeights={};
 assert.throws(()=>runTerrainSegmentCourse(f),/Unrecorded terrain sample/);
});

test('terrain traversal comparison detects altered hit output and original read order',()=>{
 const f=fixture(),output=Buffer.from(f.outputHex,'hex'),samples=Buffer.from(f.samplesHex,'hex');
 output.writeUInt32LE(output.readUInt32LE(4)^1,4);f.outputHex=output.toString('hex');
 samples.writeUInt32LE(samples.readUInt32LE(4)^1,4);f.samplesHex=samples.toString('hex');
 const r=compareTerrainSegmentCourse(f);assert.equal(r.differences.length,1);assert.equal(r.readDifferences,4);
});
