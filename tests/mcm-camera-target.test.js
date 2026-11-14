import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareCameraTarget} from '../scripts/mcm-reference/compare-camera-target.mjs';
import {analyzeLiveCameraTarget} from '../scripts/mcm-reference/analyze-live-camera-target.mjs';
import {analyzeLiveViewMatrix} from '../scripts/mcm-reference/analyze-live-view-matrix.mjs';
const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/camera-target-wine11.json.br',import.meta.url))));
test('camera aim matches original fields, flags and return value across 1000 native cases',()=>{
 const input=Buffer.from(f.inputHex,'hex'),output=Buffer.from(f.outputHex,'hex');
 assert.deepEqual(compareCameraTarget(input,output),{cases:1000,words:14000,unchanged:100,differences:0,examples:[]});
 output[40]^=1;assert.equal(compareCameraTarget(input,output).differences,1);
 assert.throws(()=>compareCameraTarget(input,output.subarray(0,-1)),/Incomplete/);
});
test('native chase-camera target calls feed the recovered view and renderer product path',()=>{
 assert.deepEqual(analyzeLiveCameraTarget(f.live),{pairs:9,words:126,views:54,viewWords:864,ignoredViews:2});
 const render=analyzeLiveViewMatrix(f.live);assert.equal(render.viewPairs,56);assert.equal(render.viewSubmissions,9);assert.equal(render.products,27);
});
test('camera target trace rejects invalid caller, state, cleanup and missing boundaries',()=>{
 const change=(phase,key,value)=>{const rows=structuredClone(f.live);rows.find(r=>r.phase===phase)[key]=value;return rows;};
 assert.throws(()=>analyzeLiveCameraTarget(change('before-target','callee',0)),/AssertionError/);
 assert.throws(()=>analyzeLiveCameraTarget(change('before-target','retainedMode',1)),/Unsupported/);
 assert.throws(()=>analyzeLiveCameraTarget(change('after-target','upValid',0)),/upValid/);
 assert.throws(()=>analyzeLiveCameraTarget(change('after-target','esp',0)),/Invalid target return/);
 assert.throws(()=>analyzeLiveCameraTarget(f.live.filter(r=>r.phase!=='after-target')),/Unpaired target|Incomplete/);
});
