import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeBikeRecord} from '../scripts/mcm-reference/decode-bike.mjs';
import {compareBikeReplay} from '../scripts/mcm-reference/compare-bike.mjs';
import {compareThrottle} from '../scripts/mcm-reference/compare-throttle.mjs';
const fixture = name => JSON.parse(fs.readFileSync(new URL(`./fixtures/mcm/${name}`, import.meta.url)));

test('original player snapshots identify local control and acceleration/release state', () => {
  const states = fixture('player-state-wine11.json').records.map(decodeBikeRecord);
  assert.ok(states.every(s => s.name === 'PDM' && s.controller === 'local-input'));
  const at = frame => states.find(s => s.playerFrame === frame);
  assert.ok(at(49).speedMetresPerSecond < 0.001);
  assert.equal(at(50).throttleState, Math.fround(.02));
  assert.equal(at(199).gearIndex, 3);
  assert.ok(Math.abs(at(199).speedMetresPerSecond - 22.248141998344153) < 1e-12);
  assert.equal(at(200).throttleState, Math.fround(.96));
  assert.equal(at(224).throttleState, 0);
  assert.ok(at(399).speedMetresPerSecond < at(224).speedMetresPerSecond);
});

test('replay comparison preserves unexplained differences instead of hiding them', () => {
  const {rows} = fixture('replay-boundaries-wine11.json');
  const result = compareBikeReplay(rows);
  assert.equal(result.firstMotionDifference, null);
  assert.deepEqual(result.differingEngineWords, {});
  assert.ok(Object.keys(result.differingBikeWords).every(k => ['0x488', '0x48c', '0x490', '0x494'].includes(k)));
  const changed = structuredClone(rows);
  const b = Buffer.from(changed[5].stateHex, 'hex');
  b.writeFloatLE(10, 0x510);
  changed[5].stateHex = b.toString('hex');
  assert.ok(compareBikeReplay(changed).firstMotionDifference.fields.includes('velocityFeetPerSecond'));
  changed[5].frameBits++;
  assert.throws(() => compareBikeReplay(changed), /controls differ/);
});

test('digital throttle translation matches 321 live helper fixtures including shifts', () => {
  const {rows} = fixture('throttle-wine11.json');
  const result = compareThrottle(rows);
  assert.equal(result.pairs, 321);
  assert.equal(result.shiftCases, 31);
  assert.ok(result.pressedCases > 0 && result.releasedCases > 0);
  assert.deepEqual(result.failures, []);
  const corrupt = structuredClone(rows.slice(0, 2));
  corrupt[1].stateBits ^= 1;
  assert.equal(compareThrottle(corrupt).failures[0].field, 'stateBits');
});

test('automatic gearbox matches live shifts, random thresholds and timer skips', async () => {
  const {compareGears} = await import('../scripts/mcm-reference/compare-gears.mjs');
  const {rows} = fixture('gears-wine11.json');
  const result = compareGears(rows);
  assert.equal(result.upshifts, 4);
  assert.equal(result.downshifts, 2);
  assert.equal(result.timerSkips, 16);
  assert.deepEqual(result.failures, []);
});

test('drive force matches original instruction fixtures across curve and speed boundaries', async () => {
  const {calculateMcmDriveForce} = await import('../src/physics/mcm/drive-force.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  const {fixtures} = fixture('drive-force-wine11.json');
  for (const {input, outputBits} of fixtures) {
    const result = calculateMcmDriveForce(input);
    assert.deepEqual([result.scalar, ...result.vector].map(floatBits), outputBits);
  }
});

test('linear integration matches original velocity, speed and position outputs', async () => {
  const {integrateMcmLinear} = await import('../src/physics/mcm/integrate-linear.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  const {fixtures} = fixture('linear-wine11.json');
  assert.ok(fixtures.some(c => c.input.frozen));
  assert.ok(fixtures.some(c => c.input.dt === 0));
  for (const {input, outputBits} of fixtures) {
    const result = integrateMcmLinear(input);
    assert.deepEqual([...result.position, ...result.velocity, result.speed].map(floatBits), outputBits);
  }
});

test('opposing acceleration matches original clamp and stationary branches', async () => {
  const {applyMcmOpposingAcceleration} = await import('../src/physics/mcm/opposing-acceleration.js');
  const {floatBits, bitsFloat} = await import('../src/physics/mcm/math.js');
  const {fixtures} = fixture('opposing-wine11.json');
  for (const {inputBits, outputBits} of fixtures) {
    const floats = inputBits.slice(0, 10).map(bitsFloat);
    const result = applyMcmOpposingAcceleration({velocity:floats.slice(0,3),
      acceleration:floats.slice(3,6), opposing:floats.slice(6,9), dt:floats[9], mask:inputBits[10]});
    assert.deepEqual([...result.velocity,...result.acceleration].map(floatBits),outputBits);
  }
});

test('inverse square root preserves the original binary64 intermediate', async () => {
  const {mcmInverseSqrt} = await import('../src/physics/mcm/inverse-sqrt.js');
  const {bitsFloat} = await import('../src/physics/mcm/math.js');
  for (const {inputBits,outputHex} of fixture('inverse-sqrt-wine11.json').fixtures) {
    const output = Buffer.alloc(8); output.writeDoubleLE(mcmInverseSqrt(bitsFloat(inputBits)));
    assert.equal(output.toString('hex'),outputHex);
  }
  for (const value of [0,-1,Infinity,NaN,Math.pow(2,-149)]) assert.throws(()=>mcmInverseSqrt(value),RangeError);
});

test('rotation preparation preserves original axis, angle and skipped-state behavior', async () => {
  const {prepareMcmRotation} = await import('../src/physics/mcm/rotation-step.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  const fixtures = fixture('rotation-wine11.json').fixtures;
  assert.ok(fixtures.some(f=>f.outputBits[4]===0));
  assert.ok(fixtures.some(f=>f.outputBits[4]===1));
  for (const {input,outputBits} of fixtures) {
    const r=prepareMcmRotation(input);
    assert.deepEqual([...[r.angle,...r.axis].map(floatBits),+r.apply],outputBits);
  }
});

test('matrix multiplication and local rotation match original transform outputs', async () => {
  const {multiplyMcmMatrices} = await import('../src/physics/mcm/matrix.js');
  const {mcmAxisAngleMatrix} = await import('../src/physics/mcm/axis-angle.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input:{a,b,axis,angle},outputBits} of fixture('transform-wine11.json').fixtures) {
    const rotated=multiplyMcmMatrices(a,mcmAxisAngleMatrix(axis,angle));
    rotated.splice(12,3,...a.slice(12,15));
    assert.deepEqual([...multiplyMcmMatrices(a,b),...rotated].map(floatBits),outputBits.slice(0,32));
    assert.equal(outputBits[32],0);
  }
});

test('pivot rotation preserves original translation and rotation rounding', async () => {
  const {rotateMcmTransformAtPivot} = await import('../src/physics/mcm/transform.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input:{matrix,pivot,axis,angle},outputBits} of fixture('pivot-wine11.json').fixtures) {
    assert.deepEqual(rotateMcmTransformAtPivot(matrix,pivot,axis,angle).map(floatBits),outputBits.slice(0,16));
    assert.equal(outputBits[16],0);
  }
});

test('whole-bike replay detects transform bit changes and distinguishes missing orientation', () => {
  const {rows} = fixture('replay-boundaries-wine11.json');
  assert.equal(decodeBikeRecord(rows[0]).transformMatrix, null);
  const captured = structuredClone(rows);
  const matrix = Buffer.alloc(64);
  for (const i of [0,5,10,15]) matrix.writeFloatLE(1,i*4);
  for (const row of captured) row.matrixHex = matrix.toString('hex');
  assert.equal(compareBikeReplay(captured).firstMotionDifference,null);
  matrix.writeUInt32LE(0x80000000,4); // -0: numerical JSON comparison alone would miss this.
  captured[5].matrixHex = matrix.toString('hex');
  assert.ok(compareBikeReplay(captured).firstMotionDifference.fields.includes('transformMatrixBits'));
  captured[5].matrixHex = '00';
  assert.throws(()=>decodeBikeRecord(captured[5]),/Invalid transform matrix/);
});

test('suspension helper matches original progressive spring and damping forces', async () => {
  const {calculateMcmSuspension} = await import('../src/physics/mcm/suspension.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('suspension-wine11.json').fixtures) {
    const r=calculateMcmSuspension(input);
    assert.deepEqual([...r.force,...r.dampingForce].map(floatBits),outputBits);
  }
});

test('contact torque matches original branch thresholds and angular velocity side effect', async () => {
  const {calculateMcmContactTorque} = await import('../src/physics/mcm/contact-torque.js');
  const {floatBits,bitsFloat} = await import('../src/physics/mcm/math.js');
  for (const {input,angularVelocityXBits,outputBits} of fixture('contact-torque-wine11.json').fixtures) {
    const r=calculateMcmContactTorque({...input,angularVelocityX:bitsFloat(angularVelocityXBits)});
    assert.deepEqual([...r.torque,r.angularVelocityX].map(floatBits),outputBits);
  }
});

test('world transform hierarchy and inverse rotation match original outputs and cache flags', async () => {
  const {resolveMcmWorldMatrix,inverseRotateMcmVector} = await import('../src/physics/mcm/world-transform.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input:c,outputBits} of fixture('world-transform-wine11.json').fixtures) {
    const nodes=[];
    for(let j=0;j<3;j++)nodes.push({local:c.matrices[j],parent:nodes[j-1],cacheValid:0});
    if(c.mode===3){nodes[2].cacheValid=7;nodes[2].world=c.matrices[0];}
    const world=resolveMcmWorldMatrix(nodes[c.mode===3?2:c.mode]);
    assert.deepEqual([...[...world,...inverseRotateMcmVector(world,c.vector)].map(floatBits),...nodes.map(n=>n.cacheValid)],outputBits);
  }
});

test('connected angular update matches original inertia, damping, and velocity outputs', async () => {
  const {integrateMcmAngular} = await import('../src/physics/mcm/angular-step.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('angular-step-wine11.json').fixtures) {
    const r=integrateMcmAngular(input);
    assert.deepEqual([...r.velocity,...r.acceleration,...r.opposing,...r.opposingLocal].map(floatBits),outputBits);
  }
});

test('contact orientation corrections match original pivot rotations and branch state', async () => {
  const {applyMcmContactCorrection} = await import('../src/physics/mcm/contact-correction.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('contact-correction-wine11.json').fixtures) {
    const r=applyMcmContactCorrection(input);
    assert.deepEqual([...[...r.matrix,...r.acceleration,r.field6ac].map(floatBits),r.mask],outputBits);
  }
});

test('contact correction and angular integration match original when executed together', async () => {
  const {updateMcmAngularWithContact} = await import('../src/physics/mcm/angular-step.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('angular-contact-wine11.json').fixtures) {
    const r=updateMcmAngularWithContact(input);
    assert.deepEqual([...[...r.matrix,...r.velocity,...r.acceleration,...r.opposing,...r.opposingLocal,r.field6ac].map(floatBits),r.mask],outputBits);
  }
});

test('contact force limit matches original scaling and remaining budget mutations', async () => {
  const {limitMcmContactForce} = await import('../src/physics/mcm/contact-force-limit.js');
  const {floatBits,bitsFloat} = await import('../src/physics/mcm/math.js');
  for (const {input,forceBits,outputBits} of fixture('contact-force-limit-wine11.json').fixtures) {
    const r=limitMcmContactForce({...input,force:forceBits.map(bitsFloat)});
    assert.deepEqual([...r.force,r.magnitude,r.remaining].map(floatBits),outputBits);
  }
});

test('front and rear tire forces match original alignment, magnitude and vector outputs', async () => {
  const {calculateMcmTireForce} = await import('../src/physics/mcm/tire-force.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('tire-force-wine11.json').fixtures) {
    const actual=[false,true].flatMap(rear=>{
      const r=calculateMcmTireForce({...input,rear});
      return [r.alignment,r.perpendicular,r.magnitude,...r.force].map(floatBits);
    });
    assert.deepEqual(actual,outputBits);
  }
});

test('contact accumulation matches original force limiting and moment-arm torque sums', async () => {
  const {accumulateMcmContactForce} = await import('../src/physics/mcm/contact-accumulation.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('contact-accumulation-wine11.json').fixtures) {
    const r=accumulateMcmContactForce(input);
    assert.deepEqual([...r.force,r.remaining,...r.totalForce,...r.totalTorque].map(floatBits),outputBits);
  }
});

test('steering velocity correction matches original normal and CRT domain-error outputs', async () => {
  const {updateMcmSteeringVelocity} = await import('../src/physics/mcm/steering-velocity.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  const cases=fixture('steering-velocity-wine11.json').fixtures;
  assert.equal(cases.filter(c=>c.input.outOfDomain).length,62);
  for (const {input,outputBits} of cases) {
    const r=updateMcmSteeringVelocity(input);
    assert.deepEqual([...r.velocity,...r.temporary,r.radius,r.turnAngle].map(floatBits),outputBits);
  }
});

test('suspension travel update matches original displacement velocity and component state', async () => {
  const {updateMcmSuspensionTravel} = await import('../src/physics/mcm/suspension-travel.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('suspension-travel-wine11.json').fixtures) {
    const r=updateMcmSuspensionTravel(input);
    assert.deepEqual([...[r.travel,...r.displacement,...r.componentDisplacement,...r.velocity,...r.translation,...r.previousDisplacement,r.previousTravel].map(floatBits),r.limited,r.increasing,r.cacheValid],outputBits);
  }
});

test('suspension contact geometry and component update match original together', async () => {
  const {updateMcmSuspensionContact} = await import('../src/physics/mcm/suspension-contact.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('suspension-contact-wine11.json').fixtures) {
    const r=updateMcmSuspensionContact(input);
    assert.deepEqual([...[...r.displacement,...r.velocity,r.compression,r.travel,...r.translation,...r.previousDisplacement,r.previousTravel].map(floatBits),r.limited,r.contactLimited,r.cacheValid],outputBits);
  }
});

test('rotating suspension travel matches original velocity, state and matrix updates', async () => {
  const {updateMcmRotatingSuspension} = await import('../src/physics/mcm/rotating-suspension.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('rotating-suspension-wine11.json').fixtures) {
    const r=updateMcmRotatingSuspension(input);
    assert.deepEqual([...[...r.displacement,...r.velocity,r.travel,r.previousTravel,...r.matrix].map(floatBits),r.limited,r.increasing,r.cacheValid],outputBits);
  }
});

test('rotating contact geometry matches original component update and zero-contact branch', async () => {
  const {updateMcmRotatingContact} = await import('../src/physics/mcm/rotating-contact.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input,outputBits} of fixture('rotating-contact-wine11.json').fixtures) {
    const r=updateMcmRotatingContact(input);
    assert.deepEqual([...[...r.displacement,...r.velocity,r.compression,r.travel,...r.matrix,r.previousTravel].map(floatBits),r.limited,r.contactLimited,r.cacheValid],outputBits);
  }
});

test('terrain hierarchy lookup matches original height precision and normal scaling', async () => {
  const {sampleMcmTerrain} = await import('../src/physics/mcm/terrain-sample.js');
  for (const {input:c,outputBits} of fixture('terrain-sample-wine11.json').fixtures) {
    const leaf={level:0,bias:c.bias,scale:c.scale,heights:Array.from({length:289},(_,j)=>(c.base+j*137)&65535),normals:Array.from({length:289},()=>c.normal)};
    const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
    const root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)}][c.mode];
    const r=sampleMcmTerrain(root,c.x,c.z),bytes=Buffer.alloc(28);
    bytes.writeDoubleLE(r.height);bytes.writeDoubleLE(r.height,8);
    r.normal.forEach((v,j)=>bytes.writeFloatLE(v,16+j*4));
    assert.deepEqual(Array.from({length:7},(_,j)=>bytes.readUInt32LE(j*4)),outputBits);
  }
});

test('continuous terrain height matches original triangle selection and grid rounding', async () => {
  const {queryMcmTerrainHeight} = await import('../src/physics/mcm/terrain-height.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input:c,outputBits} of fixture('terrain-height-wine11.json').fixtures) {
    const leaf={level:0,bias:c.bias,scale:c.scale,heights:Array.from({length:289},(_,j)=>(c.base+j*137)&65535),normals:Array.from({length:289},()=>[0,1,0])};
    const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
    const root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)},null][c.mode];
    assert.deepEqual(queryMcmTerrainHeight({...c,root}).map(floatBits),outputBits);
  }
});

test('continuous smooth terrain normals preserve original corner selection and rounding', async () => {
  const {queryMcmTerrainHeight} = await import('../src/physics/mcm/terrain-height.js');
  const {queryMcmTerrainNormal} = await import('../src/physics/mcm/terrain-normal.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input:c,outputBits} of fixture('terrain-normal-wine11.json').fixtures) {
    const leaf={level:0,bias:c.bias,scale:c.scale,heights:Array.from({length:289},(_,j)=>(c.base+j*137)&65535),normals:Array.from({length:289},(_,j)=>c.normals[(j%17%2)+2*(Math.floor(j/17)%2)])};
    const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
    const root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)},null][c.mode];
    assert.deepEqual([...queryMcmTerrainHeight({...c,root}),...queryMcmTerrainNormal({...c,root,normal:[1,2,3]})].map(floatBits),outputBits);
  }
});

test('continuous face terrain normals preserve original normalization and orientation', async () => {
  const {queryMcmTerrainHeight} = await import('../src/physics/mcm/terrain-height.js');
  const {queryMcmTerrainFaceNormal} = await import('../src/physics/mcm/terrain-face-normal.js');
  const {floatBits} = await import('../src/physics/mcm/math.js');
  for (const {input:c,outputBits} of fixture('terrain-face-normal-wine11.json').fixtures) {
    const leaf={level:0,bias:c.bias,scale:c.scale,heights:Array.from({length:289},(_,j)=>(c.base+j*137)&65535),normals:Array.from({length:289},(_,j)=>c.normals[(j%17%2)+2*(Math.floor(j/17)%2)])};
    const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
    const root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)},null][c.mode];
    assert.deepEqual([...queryMcmTerrainHeight({...c,root}),...queryMcmTerrainFaceNormal({...c,root,normal:[1,2,3]})].map(floatBits),outputBits);
  }
});
