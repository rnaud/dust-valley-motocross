// Retail MCM layout established from allocation, input dispatch and live motion.
export const BIKE_BYTES = 0xcc8;
export const ENGINE_PREFIX_BYTES = 0x16c;
export function decodeBikeRecord(record) {
  if (typeof record.stateHex !== 'string' || !/^[0-9a-f]+$/.test(record.stateHex) || record.stateHex.length < BIKE_BYTES * 2) throw new Error('Truncated bike state');
  if (typeof record.engineHex !== 'string' || !/^[0-9a-f]+$/.test(record.engineHex) || record.engineHex.length < ENGINE_PREFIX_BYTES * 2) throw new Error('Truncated engine state');
  if (record.matrixHex !== undefined && (typeof record.matrixHex !== 'string' || !/^[0-9a-f]{128}$/.test(record.matrixHex))) throw new Error('Invalid transform matrix');
  const matrix = record.matrixHex === undefined ? null : Buffer.from(record.matrixHex, 'hex');
  const bike = Buffer.from(record.stateHex, 'hex'), engine = Buffer.from(record.engineHex, 'hex');
  const vec = offset => [0, 4, 8].map(i => bike.readFloatLE(offset + i));
  const positionFeet = vec(0x4f8), velocityFeetPerSecond = vec(0x510);
  const aiFlag = bike.readUInt32LE(0x614);
  if (aiFlag !== 0 && aiFlag !== 1) throw new Error('Unknown controller classification');
  return {
    sequence: record.sequence, phase: record.phase, bike: record.bike,
    name: bike.subarray(0xc1c, 0xc2c).toString('latin1').split('\0')[0],
    controller: aiFlag ? 'ai' : 'local-input',
    positionFeet, velocityFeetPerSecond,
    angularVelocity: vec(0x534), accelerationFeetPerSecondSquared: vec(0x51c),
    transformMatrixBits: matrix && Array.from({length:16},(_,i)=>matrix.readUInt32LE(i*4)),
    transformMatrix: matrix && Array.from({length:16},(_,i)=>matrix.readFloatLE(i*4)),
    speedMetresPerSecond: Math.hypot(...velocityFeetPerSecond) * 0.3048,
    gearIndex: engine.readUInt32LE(0x158),
    throttleState: engine.readFloatLE(0x160),
    rpmDemand: engine.readFloatLE(0x15c),
    shiftThreshold: engine.readFloatLE(0x154),
    shiftTimer: engine.readFloatLE(0x168),
    throttleReleased: engine.readUInt32LE(0x150),
    suppliedFrameDelta: new Float32Array(new Uint32Array([record.frameBits]).buffer)[0],
    playerFrame: record.playerFrame, requestedThrottle: record.requestedThrottle,
    scripted: record.scripted, pass: record.pass,
  };
}
