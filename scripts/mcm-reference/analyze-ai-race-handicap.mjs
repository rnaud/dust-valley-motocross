import assert from 'node:assert/strict';
import {replayAiEntry} from './analyze-ai-entry.mjs';
import {computeMcmAiRaceHandicap} from '../../src/physics/mcm/ai-race-handicap.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
// The mode-0 capture has no other actor route table. Do not invent it for races.
// Original inactive progress scratch is uninitialized: preserve the entry boundary.
export function replayAiRaceHandicap(rows){
 const startup=replayAiEntry(rows),route=rows.find(r=>r.phase==='route').nodes.map(n=>float(n.words[8])),checks=[];
 for(const entry of rows.filter(r=>r.phase==='before')){
  const b=Buffer.from(entry.hex,'hex'),ctx=rows.find(r=>r.phase==='race-context'&&r.sequence===entry.sequence),stage=rows.find(r=>r.phase==='lookahead-after'&&r.sequence===entry.sequence),after=rows.find(r=>r.phase==='after'&&r.sequence===entry.sequence),raceActive=startup.checks.find(r=>r.sequence===entry.sequence).stage.raceActive,other=Buffer.from(ctx.otherHex,'hex');
  assert.equal(raceActive,false,'Missing live other-actor route table for active race');
  const r=computeMcmAiRaceHandicap({raceActive,initialProgress:float(ctx.stack[22]),lap:b.readInt32LE(0xbe4),otherLap:other.readInt32LE(0xbe4),index:b.readInt32LE(0xc10),otherIndex:other.readInt32LE(0xc10),routeCount:b.readInt32LE(0xb00),maxProgress:b.readFloatLE(0xb90),minProgress:b.readFloatLE(0xb94),maxDistance:b.readFloatLE(0xb98),minDistance:b.readFloatLE(0xb9c),maxScale:b.readFloatLE(0xba0),minScale:b.readFloatLE(0xba4),currentDistance:b.readFloatLE(0xc04),route,otherRoute:[]});
  assert.equal(bits(r.progress),stage.stack[22],'Computed handicap progress');assert.equal(bits(r.scale),Buffer.from(stage.hex,'hex').readUInt32LE(0xba8),'Computed handicap scale');assert.equal(bits(r.scale),Buffer.from(after.hex,'hex').readUInt32LE(0xba8),'Handicap scale exit');checks.push({sequence:entry.sequence,raceActive,...r});
 }
 return {calls:checks.length,checks};
}
