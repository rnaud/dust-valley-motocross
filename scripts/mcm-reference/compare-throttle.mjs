import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {updateMcmDigitalThrottle} from '../../src/physics/mcm/throttle.js';

export function compareThrottle(rows) {
  if (!rows.length || rows.length % 2) throw new Error('Empty or incomplete throttle capture');
  const view = new DataView(new ArrayBuffer(4));
  const float = value => {view.setUint32(0, value, true); return view.getFloat32(0, true);};
  const bits = value => {view.setFloat32(0, value, true); return view.getUint32(0, true);};
  const failures = [];
  let pressedCases = 0, shiftCases = 0;
  for (let i = 0; i < rows.length; i += 2) {
    const a = rows[i], b = rows[i + 1];
    if (a.phase !== 'before' || b.phase !== 'after' || a.engine !== b.engine || a.thread !== b.thread) throw new Error(`Mispaired throttle sample ${i}`);
    for (const field of ['pressed', 'dtBits', 'aiDemand', 'maxRpm', 'cw', 'shiftTimerBits']) {
      if (a[field] !== b[field]) throw new Error(`Changed helper input ${field}`);
    }
    if (a.cw !== 0x027f) throw new Error('Unsupported live FPU mode');
    const result = updateMcmDigitalThrottle({state: float(a.stateBits), released: a.released,
      shiftTimer: float(a.shiftTimerBits), pressed: a.pressed !== 0, dt: float(a.dtBits),
      aiDemand: a.aiDemand | 0, maxRpm: a.maxRpm});
    pressedCases += a.pressed !== 0;
    shiftCases += float(a.shiftTimerBits) !== 0;
    for (const [field, expected] of [['stateBits', bits(result.state)], ['rpmBits', bits(result.rpmDemand)], ['released', result.released]]) {
      if (b[field] !== expected) failures.push({pair: i / 2, field, actual: b[field], expected});
    }
  }
  return {pairs: rows.length / 2, pressedCases, releasedCases: rows.length / 2 - pressedCases, shiftCases, failures};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/mcm-reference/compare-throttle.mjs capture.jsonl');
  const result = compareThrottle(fs.readFileSync(process.argv[2], 'utf8').trim().split(/\r?\n/).map(JSON.parse));
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
}
