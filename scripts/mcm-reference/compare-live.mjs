// Compare observed live scheduler boundaries, preserving raw float32 bits.
import fs from 'node:fs';
import {scheduleMcmFrame, MCM_STEP, MCM_MAX_ITERATIONS} from '../../src/physics/mcm/scheduler.js';

export function compareLiveScheduler(rows) {
  const view = new DataView(new ArrayBuffer(4));
  const float = bits => { view.setUint32(0, bits, true); return view.getFloat32(0, true); };
  const bits = value => { view.setFloat32(0, value, true); return view.getUint32(0, true); };
  const pending = new Map(), bikes = new Set(), controlWords = new Set();
  const failures = [], cases = [];
  let previousSequence = -1, minFrameDelta = Infinity, maxFrameDelta = 0;
  for (const row of rows) {
    if (row.sequence !== previousSequence + 1) throw new Error('Non-contiguous capture sequence');
    previousSequence = row.sequence;
    for (const field of ['frameBits', 'carryBits', 'nominalBits', 'cap', 'cw', 'thread']) {
      if (!Number.isInteger(row[field]) || row[field] < 0 || row[field] > 0xffffffff) {
        throw new Error(`Invalid ${field} at record ${row.sequence}`);
      }
    }
    if (typeof row.bike !== 'string' || !/^[0-9a-f]{8}$/.test(row.bike)) throw new Error('Invalid bike address');
    if (row.nominalBits !== bits(MCM_STEP) || row.cap !== MCM_MAX_ITERATIONS) {
      throw new Error('Unsupported live scheduler configuration');
    }
    if (row.cw !== 0x027f && row.cw !== 0x037f) throw new Error('Unsupported x87 control word');
    bikes.add(row.bike);
    controlWords.add(row.cw);
    const key = `${row.thread}:${row.bike}`;
    if (row.phase === 'before-scheduler') {
      if (pending.has(key)) throw new Error('Duplicate before boundary');
      pending.set(key, row);
      continue;
    }
    if (row.phase !== 'after-scheduler') throw new Error('Unknown capture phase');
    const before = pending.get(key);
    if (!before) throw new Error('After boundary without before');
    if (before.frameBits !== row.frameBits || before.cw !== row.cw) throw new Error('Mismatched boundary pair');
    const frameDelta = float(before.frameBits);
    const expected = scheduleMcmFrame(frameDelta, float(before.carryBits));
    minFrameDelta = Math.min(minFrameDelta, frameDelta);
    maxFrameDelta = Math.max(maxFrameDelta, frameDelta);
    for (const [field, actual, wanted] of [
      ['dtBits', row.dtBits, bits(expected.dt)],
      ['carryBits', row.carryBits, bits(expected.remainder)],
      ['steps', row.steps, expected.iterations],
    ]) {
      if (actual !== wanted) failures.push({sequence: row.sequence, bike: row.bike, field, actual, expected: wanted});
    }
    cases.push({frameBits: before.frameBits, inputCarryBits: before.carryBits,
      dtBits: row.dtBits, carryBits: row.carryBits, steps: row.steps, cw: row.cw});
    pending.delete(key);
  }
  if (pending.size || !cases.length) throw new Error('Incomplete or empty capture');
  return {records: rows.length, pairs: cases.length, bikes: [...bikes], controlWords: [...controlWords],
    frameDeltaRange: [minFrameDelta, maxFrameDelta], failures, cases};
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/mcm-reference/compare-live.mjs capture.jsonl');
  const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse);
  const {cases, ...report} = compareLiveScheduler(rows);
  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length) process.exitCode = 1;
}
