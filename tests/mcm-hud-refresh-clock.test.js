import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareHudRefreshClock} from '../scripts/mcm-reference/compare-hud-refresh-clock.mjs';
import {compareLiveHudRefreshClock} from '../scripts/mcm-reference/compare-live-hud-refresh-clock.mjs';
import {tickMcmHudRefreshClock} from '../src/physics/mcm/hud-refresh-clock.js';
const fixture=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));
test('HUD refresh scheduling matches native thresholds, gates, overflow and 400-step histories',()=>{
 const data=fixture('hud-refresh-clock'),input=Buffer.from(data.input,'base64'),output=Buffer.from(data.output,'base64'),r=compareHudRefreshClock(input,output);
 assert.equal(r.cases,131);assert.equal(r.steps,1328);assert.equal(r.comparedWords,5312);assert.equal(r.changedWords,3235);assert.equal(r.refreshes,289);assert.deepEqual(r.differences,[]);
 output[8]^=1;assert.equal(compareHudRefreshClock(input,output).differences[0].word,2);
 const clock={elapsed:.5,frames:9,frameMilliseconds:17};
 assert.equal(tickMcmHudRefreshClock(clock,{dt:0,enabled:0,refresh:()=>assert.fail('Disabled refresh')}),false);
 assert.deepEqual(clock,{elapsed:0,frames:0,frameMilliseconds:50});
});
test('live HUD clock retains all 80 updates and observes the graphics scratch boundary without injecting it',()=>{
 const rows=fixture('live-hud-refresh-clock'),r=compareLiveHudRefreshClock(rows);
 assert.equal(r.frames,80);assert.equal(r.comparedWords,480);assert.equal(r.predictedRefreshes,4);assert.deepEqual(r.differences,[]);
 assert.equal(r.changedScratchWords,1);assert.equal(r.scratchChanges[0].frame,2);assert.equal(r.scratchChanges[0].after,0);assert.equal(r.scratchChanges[0].refreshed,true);
 rows[7].frameMillisecondsBits^=1;assert.ok(compareLiveHudRefreshClock(rows).differences.some(d=>d.frame===3&&d.phase==='after'));
 rows[7].dtBits^=1;assert.throws(()=>compareLiveHudRefreshClock(rows),/sequence differs/);
});
