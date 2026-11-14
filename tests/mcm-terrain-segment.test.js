import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareTerrainSegments} from '../scripts/mcm-reference/compare-terrain-segment.mjs';
import {queryMcmTerrainSegment} from '../src/physics/mcm/terrain-segment.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/terrain-segment-wrapper-wine11.json.br',import.meta.url))));

test('terrain segment wrapper matches original clipping, callback arguments and result conversion',()=>{
 const {cases,outputHex}=fixture(),report=compareTerrainSegments(cases,Buffer.from(outputHex,'hex'));
 assert.equal(report.cases,2045);assert.equal(report.wordComparisons,24540);
 assert.equal(report.traversalCalls,1535);assert.deepEqual(report.differences,[]);
});

test('missing traversal cannot silently become a terrain miss; rejected segments preserve output',()=>{
 const terrain={heightScale:1/256,root:{shift:8,minimumHeight:0,maximumHeight:4096}},out=[71,-83,97];
 assert.throws(()=>queryMcmTerrainSegment(terrain,[1,1,1],[2,2,2],out,0),/Unmapped terrain segment traversal/);
 assert.deepEqual(out,[71,-83,97]);
 assert.equal(queryMcmTerrainSegment(terrain,[-2,1,1],[-1,2,2],out,0),0);
 assert.deepEqual(out,[71,-83,97]);
});

test('segment comparator detects a corrupted original intermediate coordinate',()=>{
 const {cases,outputHex}=fixture(),output=Buffer.from(outputHex,'hex');
 output.writeUInt32LE(output.readUInt32LE(8)^1,8);
 const report=compareTerrainSegments(cases,output);
 assert.equal(report.differences.length,1);assert.equal(report.differences[0].offset,8);
});
