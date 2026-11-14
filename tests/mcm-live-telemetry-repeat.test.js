import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareNativeTelemetryRepeat as compare} from '../scripts/mcm-reference/compare-live-telemetry-repeat.mjs';
test('independently restored upright pulse captures reproduce all declared physical telemetry',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-short-pulse-native-repeat-wine11.json.br',import.meta.url))));
 const r=compare(f.first,f.second);
 assert.equal(r.frames,400);assert.equal(r.comparedWords,16000);assert.equal(r.differences,0);
 assert.ok(r.telemetry.every(t=>t.crashed===0));
 const bytes=Buffer.from(f.second[41].stateHex,'hex');bytes.writeUInt32LE(bytes.readUInt32LE(0x510)^1,0x510);f.second[41].stateHex=bytes.toString('hex');
 const broken=compare(f.first,f.second);assert.equal(broken.differences,1);assert.equal(broken.firstDifferences[0].frame,20);assert.equal(broken.firstDifferences[0].field,'velocity.x');
 assert.throws(()=>compare(f.first,f.second.slice(2)),/frame counts differ/);
});
