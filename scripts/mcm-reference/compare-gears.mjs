import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {updateMcmGears} from '../../src/physics/mcm/gears.js';
const floatBits = value => {const b = Buffer.alloc(4);b.writeFloatLE(value);return b.readUInt32LE();};
const bitsFloat = value => {const b = Buffer.alloc(4);b.writeUInt32LE(value);return b.readFloatLE();};
export function compareGears(rows) {
  let before = null, randomValue, pairs = 0, upshifts = 0, downshifts = 0, timerSkips = 0;
  const failures = [];
  for (const row of rows) {
    if (row.phase === 'before') {
      if (before) throw new Error('Duplicate shift entry');
      before = row; randomValue = undefined; continue;
    }
    if (!before || row.engine !== before.engine) throw new Error('Unpaired shift sample');
    if (row.phase === 'random') {
      if (randomValue !== undefined) throw new Error('Multiple draws in one shift');
      randomValue = row.value; continue;
    }
    if (row.phase !== 'after' || row.thread !== before.thread || row.cw !== before.cw || row.cw !== 0x027f || row.speedBits !== before.speedBits) throw new Error('Invalid shift pair');
    const a = Buffer.from(before.engineHex, 'hex'), b = Buffer.from(row.engineHex, 'hex');
    if (a.length !== 0x16c || b.length !== a.length) throw new Error('Invalid engine prefix');
    const f = offset => a.readFloatLE(offset), u = offset => a.readUInt32LE(offset);
    const gearCount = u(0x84);
    if (gearCount < 1 || gearCount > 5 || u(0x158) >= gearCount) throw new Error('Unsupported gear table');
    const result = updateMcmGears({gear: u(0x158), state: f(0x160), rpmDemand: f(0x15c), previousRpmDemand: f(0x7c),
      shiftThreshold: f(0x154), shiftTimer: f(0x168), maxRpm: a.readInt32LE(0x148), topGearLimitDisabled: u(0x14c) !== 0,
      gearCount, downshiftRpm: f(0x78), shiftDuration: f(0x80), speed: bitsFloat(before.speedBits), randomValue,
      randomScale: bitsFloat(before.randomScaleBits), ratios: Array.from({length:gearCount},(_,i)=>f(8+4*i)),
      thresholdBases: Array.from({length:gearCount},(_,i)=>f(0x20+8*i)),
      thresholdRanges: Array.from({length:gearCount},(_,i)=>f(0x50+4*i)),
      speedThresholds: Array.from({length:gearCount},(_,i)=>f(0x64+4*i))});
    for (const [field, offset, integer] of [['gear',0x158,true],['state',0x160,false],['rpmDemand',0x15c,false],['previousRpmDemand',0x7c,false],['shiftThreshold',0x154,false],['shiftTimer',0x168,false]]) {
      const expected = integer ? result[field] : floatBits(result[field]), actual = b.readUInt32LE(offset);
      if (actual !== expected) failures.push({pair:pairs,field,actual,expected});
    }
    if (result.randomUsed !== (randomValue !== undefined)) failures.push({pair:pairs,field:'randomUsed'});
    upshifts += b.readUInt32LE(0x158) > u(0x158);
    downshifts += b.readUInt32LE(0x158) < u(0x158);
    timerSkips += f(0x168) !== 0;
    pairs++; before = null;
  }
  if (before || !pairs) throw new Error('Incomplete shift capture');
  return {pairs, upshifts, downshifts, timerSkips, failures};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/mcm-reference/compare-gears.mjs capture.jsonl');
  const result = compareGears(fs.readFileSync(process.argv[2], 'utf8').trim().split(/\r?\n/).map(JSON.parse));
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
}
