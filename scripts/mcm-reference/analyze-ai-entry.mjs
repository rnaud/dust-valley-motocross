import assert from 'node:assert/strict';
import {prepareMcmAiEntry} from '../../src/physics/mcm/ai-entry.js';
import {floatBits as bits} from '../../src/physics/mcm/math.js';
// Captures start in an established world; the route-data loaded flag is an
// explicit initial boundary, not a live-observed output. First-load behavior is
// validated separately by the intact entry/loader oracle.
export function replayAiEntry(rows){
 const route=rows.find(r=>r.phase==='route');assert.ok(route,'Missing route');const table=route.nodes.map(n=>n.address),checks=[];let jumpCount,increments=0;
 for(const entry of rows.filter(r=>r.phase==='before')){
  const b=Buffer.from(entry.hex,'hex'),context=rows.find(r=>r.phase==='race-context'&&r.sequence===entry.sequence),after=rows.find(r=>r.phase==='after'&&r.sequence===entry.sequence),stage=rows.find(r=>r.phase==='lookahead-after'&&r.sequence===entry.sequence);assert.ok(context&&after,'Missing startup observation');assert.ok(stage,'Missing lookahead output');
  jumpCount??=b.readUInt32LE(0xc44);assert.equal(jumpCount,b.readUInt32LE(0xc44),'Retained jump counter entry');
  const r=prepareMcmAiEntry({routeHead:b.readUInt32LE(0xaf0),fieldb6c:b.readUInt32LE(0xb6c),jumpCount,routeIndex:b.readUInt32LE(0xafc),routeCount:b.readUInt32LE(0xb00),routeTable:table,pitch:b.readFloatLE(0x4dc),upY:b.readFloatLE(0x4d0),speed:b.readFloatLE(0x6a4),vx:b.readFloatLE(0x510),vz:b.readFloatLE(0x518),heading:b.readFloatLE(0x4e0),mode:context.mode,raceSetting:context.enabled,raceContext:context.raceFlag,routeDataLoaded:1},()=>{throw Error('Unexpected first-load request');});
  assert.ok(r.proceed,'Unexpected empty route');increments+=Number(r.jumpCount!==jumpCount);jumpCount=r.jumpCount;
  const expected=[Number(r.stage.raceActive),bits(r.stage.turnScale),bits(r.stage.cos),bits(r.stage.sin),bits(r.stage.pitchAngle),bits(r.stage.speed),bits(r.stage.velocityHeading),bits(r.stage.heading)],actual=[32,27,29,37,30,16,13,20].map(i=>context.stack[i]);assert.deepEqual(expected,actual,'Computed startup outputs');
  const observed=Buffer.from(stage.hex,'hex');assert.equal(jumpCount,observed.readUInt32LE(0xc44),'Startup jump counter');assert.equal(bits(r.throttle),observed.readUInt32LE(0xb04),'Startup throttle clear');assert.equal(bits(r.brake),observed.readUInt32LE(0xb08),'Startup brake clear');assert.equal(jumpCount,Buffer.from(after.hex,'hex').readUInt32LE(0xc44),'Retained jump counter exit');
  checks.push({sequence:entry.sequence,jumpCount,stage:r.stage});
 }
 assert.equal(checks.length,rows.filter(r=>r.phase==='after').length,'Startup observation count');return {calls:checks.length,increments,checks};
}
