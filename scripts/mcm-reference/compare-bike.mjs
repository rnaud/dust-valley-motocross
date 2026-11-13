import fs from 'node:fs';
import {compareRiderTiming} from './compare-rider-timing.mjs';
import {decodeFrameStack} from './decode-frame-stack.mjs';
import {pathToFileURL} from 'node:url';
import {decodeBikeRecord, BIKE_BYTES} from './decode-bike.mjs';

export function compareBikeReplay(rows) {
  const passes = [0, 1].map(pass => rows.filter(r => r.pass === pass));
  if (!passes[0].length || passes[0].length !== passes[1].length) throw new Error('Incomplete replay passes');
  const differingBikeWords = new Map(), differingEngineWords = new Map(), differingRiderWords = new Map(), differingStackWords = new Map();
  const hasStack = rows.some(r => r.stackHex !== undefined || r.stackAddress !== undefined);
  const hasRider = rows.some(r => r.riderHex !== undefined);
  let firstMotionDifference = null;
  const randomStateDifferences = [];
  const motionFields = ['positionFeet', 'velocityFeetPerSecond', 'angularVelocity', 'accelerationFeetPerSecondSquared', 'transformMatrixBits', 'gearIndex', 'throttleState', 'rpmDemand', 'shiftThreshold', 'shiftTimer'];
  let previous = -1;
  for (const row of rows) {
    if(hasStack)decodeFrameStack(row);
    if (hasRider && (typeof row.riderHex !== 'string' || !/^[0-9a-f]{1880}$/i.test(row.riderHex) || !/^[0-9a-f]{8}$/i.test(row.riderAddress ?? ''))) throw new Error('Missing or invalid rider allocation');
    if (hasRider && (Buffer.from(row.stateHex,'hex').readUInt32LE(0x874) !== parseInt(row.riderAddress,16) ||
        Buffer.from(row.riderHex,'hex').readUInt32LE(0x15c) !== parseInt(row.bike,16))) throw new Error('Rider owner or bike pointer differs');
    if (row.sequence !== previous + 1) throw new Error('Non-contiguous sequence');
    previous = row.sequence;
  }
  const recordDifferences = (x, y, map, frame, phase) => {
    const a = Buffer.from(x, 'hex'), b = Buffer.from(y, 'hex');
    if (a.length !== b.length) throw new Error('State sizes differ');
    for (let offset = 0; offset < a.length; offset += 4) {
      if (!a.subarray(offset, offset + 4).equals(b.subarray(offset, offset + 4))) {
        const key = `0x${offset.toString(16)}`;
        const old = map.get(key);
        map.set(key, old ? {...old, records: old.records + 1} : {records: 1, firstFrame: frame, phase});
      }
    }
  };
  const samples = [];
  for (let i = 0; i < passes[0].length; i++) {
    const a = passes[0][i], b = passes[1][i];
    if (a.playerFrame !== Math.floor(i / 2) || b.playerFrame !== a.playerFrame ||
        a.phase !== (i % 2 ? 'after-update' : 'before-update') || b.phase !== a.phase) throw new Error('Mispaired update boundaries');
    if (!a.scripted || !b.scripted || a.frameBits !== 0x3ca3d70a || b.frameBits !== a.frameBits ||
        a.requestedThrottle !== b.requestedThrottle || a.cw !== b.cw) throw new Error('Replay controls differ');
    if (a.stateHex.length !== BIKE_BYTES * 2 || b.stateHex.length !== BIKE_BYTES * 2) throw new Error('Wrong bike allocation size');
    if(a.randomState!==b.randomState)randomStateDifferences.push({frame:a.playerFrame,phase:a.phase,a:a.randomState,b:b.randomState});
    const x = decodeBikeRecord(a), y = decodeBikeRecord(b);
    if (x.controller !== 'local-input' || y.controller !== x.controller || x.name !== y.name) throw new Error('Player identity differs');
    const fields = motionFields.filter(field => JSON.stringify(x[field]) !== JSON.stringify(y[field]));
    if (fields.length && !firstMotionDifference) firstMotionDifference = {frame: a.playerFrame, phase: a.phase, fields, a: x, b: y};
    recordDifferences(a.stateHex, b.stateHex, differingBikeWords, a.playerFrame, a.phase);
    recordDifferences(a.engineHex, b.engineHex, differingEngineWords, a.playerFrame, a.phase);
    if(hasRider){
      if(a.riderAddress!==b.riderAddress)throw new Error('Rider allocation identity differs');
      recordDifferences(a.riderHex,b.riderHex,differingRiderWords,a.playerFrame,a.phase);
    }
    if(hasStack){
      if(a.stackAddress!==b.stackAddress)throw Error('Frame stack address differs');
      recordDifferences(a.stackHex,b.stackHex,differingStackWords,a.playerFrame,a.phase);
    }
    if (a.phase === 'after-update' && [0, 49, 50, 100, 150, 199, 200, 224, 225, 300, 399].includes(a.playerFrame)) samples.push(x);
  }
  const riderTiming=rows.some(r=>r.riderUpdateCount!==undefined||r.riderDtBits!==undefined)?compareRiderTiming(rows):null;
  return {riderTiming,framesPerPass: passes[0].length / 2, comparedBoundaryPairs: passes[0].length,
    firstMotionDifference, randomStateDifferences, differingBikeWords: Object.fromEntries(differingBikeWords),
    differingEngineWords: Object.fromEntries(differingEngineWords), differingRiderWords: Object.fromEntries(differingRiderWords), differingStackWords: Object.fromEntries(differingStackWords), samples};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/mcm-reference/compare-bike.mjs capture.jsonl');
  const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const report = compareBikeReplay(rows);
  console.log(JSON.stringify(report, null, 2));
  // Even the four currently unexplained inherited fields remain visible failures.
  if (report.riderTiming?.differences.length || report.randomStateDifferences.length || report.firstMotionDifference || Object.keys(report.differingBikeWords).length || Object.keys(report.differingEngineWords).length || Object.keys(report.differingRiderWords).length || Object.keys(report.differingStackWords).length) process.exitCode = 1;
}
