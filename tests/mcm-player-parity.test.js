import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {floatBits} from '../src/physics/mcm/math.js';
import {gunzipSync,brotliDecompressSync} from 'node:zlib';
import {decodeBikeRecord} from '../scripts/mcm-reference/decode-bike.mjs';
import {compareBikeReplay} from '../scripts/mcm-reference/compare-bike.mjs';
import {compareThrottle} from '../scripts/mcm-reference/compare-throttle.mjs';
const fixture = name => {const data=fs.readFileSync(new URL(`./fixtures/mcm/${name}`, import.meta.url));return JSON.parse(name.endsWith('.gz')?gunzipSync(data):name.endsWith('.br')?brotliDecompressSync(data):data);};

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
  for (const value of [-1,Infinity,NaN]) assert.throws(()=>mcmInverseSqrt(value),RangeError);
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

test('connected contact probes match original transforms, terrain results and selectors',async()=>{
  const {sampleMcmContactProbes}=await import('../src/physics/mcm/contact-probes.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  const leaf={level:0,bias:0,scale:1,heights:Array(289).fill(100),normals:Array.from({length:289},()=>[0,1,0])};
  const terrain={root:{level:1,children:Array(256).fill(leaf)},heightScale:.01171875,worldToGrid:Math.fround(1/3)};
  const seen=new Set();
  for(const {input:q,outputBits} of fixture('contact-probes-wine11.json').fixtures){
    const r=sampleMcmContactProbes({terrain,...q,componentNode:{local:q.componentMatrix,cacheValid:0},bikeNode:{local:q.bikeMatrix,cacheValid:0}});
    const pack=p=>[...p.world,...p.surface,...p.normal,p.depth].map(floatBits);
    assert.deepEqual([...pack(r.primary),...pack(r.third),r.selector,r.thirdContact,r.anyContact],outputBits);
    seen.add(r.selector);
  }
  assert.deepEqual([...seen].sort(),[0,1,2]);
});

test('suspension response matches original gating, limiting, corrections and history resets',async()=>{
  const {updateMcmSuspensionResponse}=await import('../src/physics/mcm/suspension-response.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  let active=0,skipped=0,limited=0;
  for(const {input,outputBits} of fixture('suspension-response-wine11.json').fixtures){
    const r=updateMcmSuspensionResponse(input);
    const values=[...r.displacement,...r.velocity,r.compression,r.travel,...r.translation,...r.previousDisplacement,r.previousTravel];
    assert.deepEqual([...values.map(floatBits),r.limited,r.contactLimited,r.cacheValid,...[r.height,...r.point].map(floatBits),r.active],outputBits);
    if(r.active){active++;if(r.limited)limited++;}else skipped++;
  }
  assert.ok(active>0&&skipped>0&&limited>0);
});

test('rotating response matches original gating, limiting, matrix and height corrections',async()=>{
  const {updateMcmRotatingResponse}=await import('../src/physics/mcm/rotating-response.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  let active=0,skipped=0,limited=0;
  for(const {input,outputBits} of fixture('rotating-response-wine11.json').fixtures){
    const r=updateMcmRotatingResponse(input);
    const values=[...r.displacement,...r.velocity,r.compression,r.travel,...r.matrix,r.previousTravel];
    assert.deepEqual([...values.map(floatBits),r.limited,r.contactLimited,r.cacheValid,...[r.height,...r.point].map(floatBits),r.active],outputBits);
    if(r.active){active++;if(r.limited)limited++;}else skipped++;
  }
  assert.ok(active>0&&skipped>0&&limited>0);
});

test('paired suspension forces match original response wiring and inactive scratch preservation',async()=>{
  const {calculateMcmSuspensionForces}=await import('../src/physics/mcm/suspension-forces.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  const flags=new Set();
  for(const {input,outputBits} of fixture('suspension-forces-wine11.json').fixtures){
    const r=calculateMcmSuspensionForces(input);
    assert.deepEqual([...r.first.force,...r.first.dampingForce,...r.second.force,...r.second.dampingForce].map(floatBits),outputBits);
    flags.add(input.first.active+2*input.second.active);
  }
  assert.equal(flags.size,4);
});

test('paired force torque caller matches original clipping and ordered counter mutations',async()=>{
  const {accumulateMcmPairedForceTorque}=await import('../src/physics/mcm/paired-force-torque.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  const counters=new Set();
  for(const {input,outputBits} of fixture('paired-force-torque-wine11.json').fixtures){
    const r=accumulateMcmPairedForceTorque(input);
    assert.deepEqual([... [...r.totalForce,...r.totalTorque,...r.scratch540,...r.scratch54c].map(floatBits),r.counter],outputBits);
    counters.add(r.counter);
  }
  assert.ok(counters.has(0)&&counters.has(1)&&counters.size>2);
});

test('connected force assembly and angular update match original contact corrections',async()=>{
  const {updateMcmForceAngular}=await import('../src/physics/mcm/force-angular-step.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  let changed=0;
  const modes=new Set();
  for(const {input,outputBits} of fixture('force-angular-wine11.json').fixtures){
    const r=updateMcmForceAngular(input);
    const values=[...r.totalForce,...r.totalTorque,...r.velocity,...r.acceleration,...r.opposing,...r.opposingLocal];
    assert.deepEqual([...values.map(floatBits),r.counter,...r.previousPivot.map(floatBits),...r.matrix.map(floatBits),floatBits(r.field6ac),r.mask],outputBits);
    if(r.matrix.some((v,i)=>floatBits(v)!==floatBits(input.matrix[i])))changed++;
    modes.add(input.state844+2*input.contact);
  }
  assert.equal(modes.size,4);
  assert.ok(changed>0);
});

test('force-to-linear integration preserves original steering fallback and decay state',async()=>{
  const {updateMcmForceLinear}=await import('../src/physics/mcm/force-linear-step.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  let fallback=0,generated=0,decayed=0,frozen=0;
  for(const {input,outputBits} of fixture('force-linear-wine11.json').fixtures){
    const r=updateMcmForceLinear(input);
    const values=[...r.position,...r.velocity,r.speed,...r.acceleration,...r.deltaVelocity,...r.scratch540,r.field6d8,r.field6dc];
    assert.deepEqual([...values.map(floatBits),r.field6e0>>>0,floatBits(r.rotation)],outputBits);
    if(r.field6d8===0&&r.rotation!==0)fallback++;
    if(r.field6dc!==input.field6dc)generated++;
    if(r.field6e0===input.field6e0-1)decayed++;
    if(input.frozen)frozen++;
  }
  assert.ok(fallback>0&&generated>0&&decayed>0&&frozen>0);
});

test('connected force-to-motion sequence matches original shared state and both integrations',async()=>{
  const {updateMcmForceMotion}=await import('../src/physics/mcm/force-motion-step.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  const modes=new Set();let fallback=0,frozen=0;
  for(const {input,outputBits} of fixture('force-motion-wine11.json').fixtures){
    const {angular:r,linear:l}=updateMcmForceMotion(input);
    const angular=[...r.totalForce,...r.totalTorque,...r.velocity,...r.acceleration,...r.opposing,...r.opposingLocal];
    const linear=[...l.position,...l.velocity,l.speed,...l.acceleration,...l.deltaVelocity,...l.scratch540,l.field6d8,l.field6dc];
    assert.deepEqual([...angular.map(floatBits),r.counter,...r.previousPivot.map(floatBits),...r.matrix.map(floatBits),floatBits(r.field6ac),r.mask,...linear.map(floatBits),l.field6e0>>>0,floatBits(l.rotation)],outputBits);
    modes.add(input.state844+2*input.contact+4*input.both);
    if(l.field6d8===0&&l.rotation!==0)fallback++;
    if(input.frozen)frozen++;
  }
  assert.equal(modes.size,8);assert.ok(fallback>0&&frozen>0);
});

test('force-to-transform update matches original wheel and pivoted body rotations',async()=>{
  const {updateMcmForceMotionTransform}=await import('../src/physics/mcm/force-motion-step.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  let applied=0,skipped=0,preserved=0,freeSpin=0;
  for(const {input,outputBits} of fixture('motion-transform-wine11.json').fixtures){
    const {angular:r,linear:l,transform:t}=updateMcmForceMotionTransform(input);
    const angular=[...r.totalForce,...r.totalTorque,...r.velocity,...r.acceleration,...r.opposing,...r.opposingLocal];
    const linear=[...l.position,...l.velocity,l.speed,...l.acceleration,...l.deltaVelocity,...t.axis,l.field6d8,l.field6dc];
    assert.deepEqual([...angular.map(floatBits),r.counter,...r.previousPivot.map(floatBits),...t.matrix.map(floatBits),floatBits(r.field6ac),r.mask,...linear.map(floatBits),l.field6e0>>>0,floatBits(l.rotation),...t.wheels.flatMap(w=>w.matrix).map(floatBits),...t.wheels.map(w=>floatBits(w.angle)),floatBits(t.angle),t.cacheValid,...t.wheels.map(w=>w.cacheValid)],outputBits);
    if(t.apply)applied++;else skipped++;
    preserved+=t.wheels.filter(w=>w.cacheValid).length;
    if(!input.contact&&input.state844!==2&&input.field5e4===0&&input.engineLevel>0&&input.engineLevel<1)freeSpin++;
  }
  assert.ok(applied>0&&skipped>0&&preserved>0&&freeSpin>0);
});

test('motion controller handoff matches original state gates and velocity branches',async()=>{
  const {updateMcmMotionController}=await import('../src/physics/mcm/force-motion-step.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  const branches=new Set();
  for(const {input,outputBits} of fixture('motion-controller-wine11.json').fixtures){
    const {angular:r,linear:l,transform:t,controller:h}=updateMcmMotionController(input);
    const angular=[...r.totalForce,...r.totalTorque,...r.velocity,...r.acceleration,...r.opposing,...r.opposingLocal];
    const linear=[...l.position,...l.velocity,l.speed,...l.acceleration,...l.deltaVelocity,...t.axis,l.field6d8,l.field6dc];
    assert.deepEqual([...angular.map(floatBits),r.counter,...r.previousPivot.map(floatBits),...t.matrix.map(floatBits),floatBits(r.field6ac),r.mask,...linear.map(floatBits),l.field6e0>>>0,floatBits(l.rotation),...t.wheels.flatMap(w=>w.matrix).map(floatBits),...t.wheels.map(w=>floatBits(w.angle)),floatBits(t.angle),t.cacheValid,...t.wheels.map(w=>w.cacheValid),...h.velocity.map(floatBits),...h.angularVelocity.map(floatBits)],outputBits);
    branches.add(!input.state844||(!input.controller13c&&!input.controller140)?'skip':input.field8b4===2&&input.otherVelocity?'other':input.field8b4===4||input.field8b4===7?'vertical':'damped');
  }
  assert.equal(branches.size,4);
});

test('nonzero-state orientation matches original contact gates and pivot transforms',async()=>{
  const {updateMcmMotionStateOrientation}=await import('../src/physics/mcm/force-motion-step.js');
  const {floatBits}=await import('../src/physics/mcm/math.js');
  const branches=new Set();
  for(const {input,outputBits} of fixture('state-orientation-wine11.json').fixtures){
    const {angular:r,linear:l,transform:t,controller:h,orientation:o}=updateMcmMotionStateOrientation(input);
    const angular=[...r.totalForce,...r.totalTorque,...r.velocity,...r.acceleration,...r.opposing,...r.opposingLocal];
    const linear=[...l.position,...l.velocity,l.speed,...l.acceleration,...l.deltaVelocity,...o.scratch540,l.field6d8,l.field6dc];
    assert.deepEqual([...angular.map(floatBits),r.counter,...r.previousPivot.map(floatBits),...o.matrix.map(floatBits),floatBits(r.field6ac),r.mask,...linear.map(floatBits),l.field6e0>>>0,floatBits(l.rotation),...t.wheels.flatMap(w=>w.matrix).map(floatBits),...t.wheels.map(w=>floatBits(w.angle)),floatBits(t.angle),t.cacheValid,...t.wheels.map(w=>w.cacheValid),...h.velocity.map(floatBits),...h.angularVelocity.map(floatBits),...o.axis624.map(floatBits)],outputBits);
    branches.add(!o.applied?'skip':input.both?'both':'front');
  }
  assert.equal(branches.size,3);
});

test('state-zero control matches original deflection, damping and preserved gates',async()=>{
 const {updateMcmStateZeroControl}=await import('../src/physics/mcm/state-zero-control.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 let skipped=0,deflected=0,damped=0;
 for(const {input,outputBits} of fixture('state-zero-control-wine11.json').fixtures){
  const r=updateMcmStateZeroControl(input);
  assert.deepEqual([...r.controlVector,...r.scratch540,...r.scratch54c,...r.velocity,r.speed,...r.angularVelocity].map(floatBits),outputBits);
  if(input.limitedFirst||input.limitedSecond||!input.field4bc)skipped++;
  if(r.velocity.some((v,i)=>v!==input.velocity[i]))deflected++;
  if(r.angularVelocity.some((v,i)=>v!==input.angularVelocity[i]))damped++;
 }
 assert.ok(skipped>0&&deflected>0&&damped>0);
});

test('state-zero control and rotation match original timer phases and pivot update',async()=>{
 const {updateMcmStateZeroControlRotation}=await import('../src/physics/mcm/state-zero-rotation.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 let rotated=0,zero=0,transition=0;const phases=new Set();
 for(const {input,outputBits} of fixture('state-zero-rotation-wine11.json').fixtures){
  const r=updateMcmStateZeroControlRotation(input);
  const values=[...r.controlVector,...r.scratch540,...r.scratch54c,...r.velocity,r.speed,...r.angularVelocity,...r.matrix,r.timer,r.previousSign,r.accumulator];
  assert.deepEqual([...values.map(floatBits),r.phase>>>0,floatBits(r.angle),r.cacheValid],outputBits);
  if(!r.cacheValid)rotated++;
  if(!input.limitedFirst&&!input.limitedSecond&&input.field4bc&&r.angle===0)zero++;
  if(r.phase!==input.phase)transition++;
  phases.add(input.phase);
 }
 assert.ok(rotated>0&&zero>0&&transition>0);assert.equal(phases.size,5);
});

test('alternate state-zero alignment matches original masks, correction limits and rotations',async()=>{
 const {updateMcmStateZeroAlignment}=await import('../src/physics/mcm/state-zero-alignment.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const masks=new Set();let rotated=0,preserved=0;
 for(const {input,outputBits} of fixture('state-zero-alignment-wine11.json').fixtures){
  const r=updateMcmStateZeroAlignment(input);
  const values=[...r.matrix,...r.angularVelocity,...r.scratch540,...r.axis624,...r.local420,r.field6b0,r.field6a8,r.field6ac];
  assert.deepEqual([...values.map(floatBits),r.cacheValid],outputBits);
  masks.add(input.mask);
  if(r.matrix.some((v,i)=>floatBits(v)!==floatBits(input.matrix[i])))rotated++;else preserved++;
 }
 assert.equal(masks.size,4);assert.ok(rotated>0&&preserved>0);
});

test('bike event decisions match original return values, mutations and external call counts',async()=>{
 const {decideMcmBikeEvent}=await import('../src/physics/mcm/event-decision.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const reasons=new Set();let suppressed=0,advanced=0,queried=0,randomized=0,negativeZero=0;
 for(const {input,angularVelocityBits,outputBits} of fixture('event-decision-wine11.json').fixtures){
  input.angularVelocity=angularVelocityBits.map(bitsFloat);
  const r=decideMcmBikeEvent(input);
  assert.deepEqual([r.triggered,r.eventKind,r.reason,r.otherPresent,r.field710,r.field714,...[...r.velocity,...r.angularVelocity].map(floatBits),r.randomCalls,r.inputCalls],outputBits);
  if(r.triggered)reasons.add(r.reason);
  if(input.otherPresent&&!r.otherPresent)suppressed++;
  if(input.field710&&!r.field710)advanced++;
  queried+=r.inputCalls;randomized+=r.randomCalls;
  if(Object.is(input.angularVelocity[2],-0))negativeZero++;
 }
 assert.deepEqual([...reasons].sort((a,b)=>a-b),[1,2,4,5,6,7,8,9,10,12]);
 assert.ok(suppressed>0&&advanced>0&&queried>0&&randomized>0&&negativeZero>0);
});

test('rider event selection matches original tables, rounding, flags and random consumption',async()=>{
 const {startMcmRiderEvent}=await import('../src/physics/mcm/rider-event.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const paths=new Set(),lengths=new Set();let defaults=0,zeroDraws=0;
 for(const {input,outputBits} of fixture('rider-event-wine11.json').fixtures){
  const r=startMcmRiderEvent(input);
  assert.deepEqual([r.kind,...r.selected,r.active13c,r.active16c,...r.previousVelocity.map(floatBits),r.randomCalls],outputBits);
  paths.add(`${r.kind}:${r.randomCalls}`);
  for(const group of input.records[r.kind])lengths.add(group.length);
  if(input.kind===-1)defaults++;
  if(input.randomValues.includes(0))zeroDraws++;
 }
 assert.equal(paths.size,16);assert.equal(lengths.size,6);assert.ok(defaults>0&&zeroDraws>0);
});

test('event orientation matches original axis extraction, orthogonalization and cache changes',async()=>{
 const {alignMcmEventRootOrientation}=await import('../src/physics/mcm/event-orientation.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const paths=new Set();let sourceInvalidated=0,sourcePreserved=0;
 for(const {input:c,outputBits} of fixture('event-orientation-wine11.json').fixtures){
  const target={local:[...c.targetLocal],world:[...c.targetWorld],cacheValid:c.targetCache};
  const source={local:[...c.sourceLocal],world:[...c.sourceWorld],cacheValid:c.sourceCache};
  if(c.parented){source.parent=target;target.firstChild=source;}
  const r=alignMcmEventRootOrientation(source,target);
  assert.deepEqual([...[...target.local,...target.world,...source.world,...r.forward,...r.up].map(floatBits),source.cacheValid,target.cacheValid],outputBits);
  assert.deepEqual(target.local.slice(12,15),c.targetLocal.slice(12,15));
  paths.add(`${c.parented}:${c.sourceCache}:${c.targetCache}`);
  if(source.cacheValid)sourcePreserved++;else sourceInvalidated++;
 }
 assert.equal(paths.size,8);assert.ok(sourceInvalidated>0&&sourcePreserved>0);
});

test('connected bike event wrapper matches original decisions, orientation, bounds and rider state',async()=>{
 const {transitionMcmBikeEvent}=await import('../src/physics/mcm/event-transition.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const reasons=new Set();let oriented=0,skipped=0,clamped=0;
 for(const {input,angularVelocityBits,outputBits} of fixture('event-transition-wine11.json').fixtures){
  input.angularVelocity=angularVelocityBits.map(bitsFloat);
  const r=transitionMcmBikeEvent(input);
  const actual=[r.triggered,r.eventKind,r.reason,r.otherPresent,r.field710,r.field714,...[...r.velocity,...r.angularVelocity].map(floatBits),r.randomCalls,r.inputCalls,r.state,r.field820,r.animation,...[...r.envelope,...r.direction].map(floatBits),r.inverted,floatBits(r.field890),r.resource,...[...r.boundsMin,...r.boundsMax,...r.scratch540,...r.scratch54c,...r.target.local,...r.target.world,...r.source.world].map(floatBits),r.source.cacheValid,r.target.cacheValid,...[...r.rider.velocity,...r.rider.angularVelocity,...r.rider.previousVelocity].map(floatBits),...r.rider.selected,r.rider.active13c,r.rider.active16c,r.rider.kind];
  assert.deepEqual(actual,outputBits);
  if(r.triggered)reasons.add(r.reason);else skipped++;
  if(r.triggered&&input.field820)oriented++;
  if(r.eventKind===1&&r.angularVelocity[0]!==input.angularVelocity[0])clamped++;
 }
 assert.deepEqual([...reasons].sort((a,b)=>a-b),[1,2,4,5,6,7,8,9,10,12]);
 assert.ok(oriented>0&&skipped>0&&clamped>0);
});

test('child position transforms match both original entry points and reference/cache paths',async()=>{
 const {setMcmPositionRelativeTo}=await import('../src/physics/mcm/position-transform.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const paths=new Set(),cachePaths=new Set();
 for(const {input:c,outputBits} of fixture('position-transform-wine11.json').fixtures){
  const nodes=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
  if(c.parented){nodes[0].parent=nodes[1];nodes[1].firstChild=nodes[0];}
  if(c.externalParent){nodes[2].parent=nodes[1];if(c.parented)nodes[0].nextSibling=nodes[2];else nodes[1].firstChild=nodes[2];}
  setMcmPositionRelativeTo(nodes[0],c.reference?nodes[c.reference-1]:null,c.position);
  assert.deepEqual(nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),outputBits);
  paths.add(`${c.reference}:${c.entry}`);cachePaths.add(c.nodes.map(n=>n.cacheValid).join(':'));
 }
 assert.equal(paths.size,8);assert.equal(cachePaths.size,8);
});

test('local child callback matches original orientation, relative position and record mutations',async()=>{
 const {applyMcmLocalChildTransform}=await import('../src/physics/mcm/local-child-transform.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const paths=new Set(),components=new Set();
 for(const {input:c,outputBits} of fixture('local-child-transform-wine11.json').fixtures){
  const nodes=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
  nodes[0].parent=nodes[c.targetParent];nodes[c.targetParent].firstChild=nodes[0];
  if(c.bodyParent){nodes[1].parent=nodes[2];nodes[1].nextSibling=nodes[2].firstChild;nodes[2].firstChild=nodes[1];}
  const record={forward:[...c.forward],up:[...c.up],position:[...c.position]};
  applyMcmLocalChildTransform(nodes[1],nodes[0],record);
  assert.deepEqual([...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...record.forward,...record.up].map(floatBits)],outputBits);
  paths.add(`${c.targetParent}:${c.bodyParent}:${c.nodes.map(n=>n.cacheValid).join(':')}`);components.add(c.componentIndex);
 }
 assert.equal(paths.size,32);assert.equal(components.size,8);
});

test('relative child callback matches original orientation, relative position and record mutations',async()=>{
 const {applyMcmRelativeChildTransform}=await import('../src/physics/mcm/relative-child-transform.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const paths=new Set(),components=new Set();
 for(const {input:c,outputBits} of fixture('relative-child-transform-wine11.json').fixtures){
  const nodes=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
  nodes[0].parent=nodes[c.targetParent];nodes[c.targetParent].firstChild=nodes[0];
  if(c.bodyParent){nodes[1].parent=nodes[2];nodes[1].nextSibling=nodes[2].firstChild;nodes[2].firstChild=nodes[1];}
  const record={forward:[...c.forward],up:[...c.up],position:[...c.position]};
  applyMcmRelativeChildTransform(nodes[1],nodes[0],record);
  assert.deepEqual([...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...record.forward,...record.up].map(floatBits)],outputBits);
  paths.add(`${c.targetParent}:${c.bodyParent}:${c.nodes.map(n=>n.cacheValid).join(':')}`);components.add(c.componentIndex);
 }
 assert.equal(paths.size,32);assert.equal(components.size,8);
});

test('event wrapper with ordered child callbacks matches original bike, rider and component state',async()=>{
 const {transitionMcmBikeEvent}=await import('../src/physics/mcm/event-transition.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const reasons=new Set(),childModes=new Set(),layouts=new Set();let oriented=0,skipped=0,clamped=0;
 for(const {input,angularVelocityBits,outputBits} of fixture('event-children-wine11.json').fixtures){
  input.angularVelocity=angularVelocityBits.map(bitsFloat);
  const r=transitionMcmBikeEvent(input);
  const actual=[r.triggered,r.eventKind,r.reason,r.otherPresent,r.field710,r.field714,...[...r.velocity,...r.angularVelocity].map(floatBits),r.randomCalls,r.inputCalls,r.state,r.field820,r.animation,...[...r.envelope,...r.direction].map(floatBits),r.inverted,floatBits(r.field890),r.resource,...[...r.boundsMin,...r.boundsMax,...r.scratch540,...r.scratch54c,...r.target.local,...r.target.world,...r.source.world].map(floatBits),r.source.cacheValid,r.target.cacheValid,...[...r.rider.velocity,...r.rider.angularVelocity,...r.rider.previousVelocity].map(floatBits),...r.rider.selected,r.rider.active13c,r.rider.active16c,r.rider.kind,...r.components.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...r.boundsChildren.flatMap(n=>[...n.forward,...n.up,...n.position].map(floatBits))];
  assert.deepEqual(actual,outputBits);
  if(r.triggered&&input.field820){
   for(const record of r.boundsChildren)childModes.add(record.local);
   layouts.add(input.setup.components[1].parentIndex);
  }
  if(r.triggered)reasons.add(r.reason);else skipped++;
  if(r.triggered&&input.field820)oriented++;
  if(r.eventKind===1&&r.angularVelocity[0]!==input.angularVelocity[0])clamped++;
 }
 assert.deepEqual([...reasons].sort((a,b)=>a-b),[1,2,4,5,6,7,8,9,10,12]);
 assert.ok(oriented>0&&skipped>0&&clamped>0);assert.equal(childModes.size,2);assert.equal(layouts.size,2);
});

test('common post-event state matches original vectors, award timing and suspension outputs',async()=>{
 const {updateMcmPostEventState}=await import('../src/physics/mcm/post-event-state.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const caches=new Set();let awarded=0,counted=0,zeroTimer=0,stoppedYaw=0;
 for(const {input:c,timerBits,outputBits} of fixture('post-event-state-wine11.json').fixtures){
  c.timer=bitsFloat(timerBits);
  const parent={local:[...c.parentLocal],world:[...c.parentWorld],cacheValid:c.parentCache};
  const node={local:[...c.local],world:[...c.world],cacheValid:c.cache,parent:c.parented?parent:null};
  const r=updateMcmPostEventState({...c,node});
  assert.deepEqual([...[...r.position,...r.angularVelocity,...r.worldAngularVelocity].map(floatBits),r.field714,r.field870,...[r.timer,r.score,r.frontHeight,r.rearHeight,r.lastDt,...node.world,...parent.world].map(floatBits),node.cacheValid,parent.cacheValid],outputBits);
  caches.add(`${c.parented}:${c.cache}:${c.parentCache}`);
  if(c.field714&&!r.field714)awarded++;
  if(r.timer!==c.timer&&r.field714)counted++;
  if(Object.is(c.timer,-0))zeroTimer++;
  if(c.angularVelocity[1]!==r.angularVelocity[1])stoppedYaw++;
 }
 assert.equal(caches.size,8);assert.ok(awarded>0&&counted>0&&zeroTimer>0&&stoppedYaw>0);
});

test('rider blend matches original peak gates, envelope interpolation and inactive reset',async()=>{
 const {updateMcmRiderBlend}=await import('../src/physics/mcm/rider-blend.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 let reset=0,preserved=0,changed=0,negativeZero=0,positive=0,negative=0;
 for(const {input:c,controlBits,outputBits} of fixture('rider-blend-wine11.json').fixtures){
  c.control=bitsFloat(controlBits);
  const r=updateMcmRiderBlend(c);
  assert.deepEqual([r.blend,r.positivePeak,r.negativePeak,...r.envelope].map(floatBits),outputBits);
  if(!c.enabled)reset++;
  else if(floatBits(r.blend)===floatBits(c.blend))preserved++;else changed++;
  if(Object.is(c.control,-0))negativeZero++;
  if(c.positivePeak!==r.positivePeak)positive++;
  if(c.negativePeak!==r.negativePeak)negative++;
 }
 assert.ok(reset>0&&preserved>0&&changed>0&&negativeZero>0&&positive>0&&negative>0);
});

test('connected rider pose and blend match original indices, weights and preserved state',async()=>{
 const {updateMcmRiderPose}=await import('../src/physics/mcm/rider-pose.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const modes=new Set();let height=0,lowSpeed=0,highSpeed=0,secondaryPreserved=0;
 for(const {input:c,controlBits,outputBits} of fixture('rider-pose-wine11.json').fixtures){
  c.control=bitsFloat(controlBits);
  const r=updateMcmRiderPose(c);
  assert.deepEqual([...[r.blend,r.positivePeak,r.negativePeak,...r.envelope].map(floatBits),r.pose>>>0,floatBits(r.weight),r.nextPose>>>0,floatBits(r.secondaryWeight)],outputBits);
  modes.add(c.enabled);
  if(!c.field4bc&&c.height>c.lowerHeight)height++;
  else if(c.poseSpeed<=14)lowSpeed++;else highSpeed++;
  if(r.secondaryWeight===c.secondaryWeight)secondaryPreserved++;
 }
 assert.equal(modes.size,2);assert.ok(height>0&&lowSpeed>0&&highSpeed>0&&secondaryPreserved>0);
});

test('trick start matches original flags, child callbacks and both animation selectors',async()=>{
 const {startMcmTrick}=await import('../src/physics/mcm/trick-start.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const paths=new Set();
 for(const {input:c,angularVelocityBits,outputBits} of fixture('trick-start-wine11.json').fixtures){
  c.angularVelocity=angularVelocityBits.map(bitsFloat);
 const s=c.setup,t=startMcmTrick(c),r={...t,triggered:c.state,eventKind:c.eventKind,reason:c.reason,otherPresent:c.otherPresent,field714:c.field714,velocity:c.velocity,angularVelocity:c.angularVelocity,randomCalls:0,inputCalls:0,state:c.state,direction:s.direction,inverted:s.inverted,field890:s.field890,resource:s.resource,rider:s.rider},expected=[r.triggered,r.eventKind,r.reason,r.otherPresent,r.field710,r.field714,...[...r.velocity,...r.angularVelocity].map(floatBits),r.randomCalls,r.inputCalls,r.state,r.field820,r.animation,...[...r.envelope,...r.direction].map(floatBits),r.inverted,floatBits(r.field890),r.resource,...[...r.boundsMin,...r.boundsMax,...r.scratch540,...r.scratch54c,...r.target.local,...r.target.world,...r.source.world].map(floatBits),r.source.cacheValid,r.target.cacheValid,...[...r.rider.velocity,...r.rider.angularVelocity,...r.rider.previousVelocity].map(floatBits),...r.rider.selected,r.rider.active13c,r.rider.active16c,r.rider.kind,...r.components.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...r.boundsChildren.flatMap(n=>[...n.forward,...n.up,...n.position].map(floatBits)),floatBits(t.awardBase),t.fieldb4c,...t.bikeAnimation,...t.riderAnimation];
  assert.deepEqual(expected,outputBits);paths.add(`${c.trickIndex}:${c.field820}`);
 }
 assert.equal(paths.size,32);
});

test('directional trick selection and startup match original dead zone and both trick banks',async()=>{
 const {startMcmDirectionalTrick}=await import('../src/physics/mcm/trick-selection.js');
 const {createMcmEventGraph}=await import('../src/physics/mcm/event-graph.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const selected=new Set();let skipped=0;
 for(const {input:c,angularVelocityBits,outputBits} of fixture('trick-selection-wine11.json').fixtures){
  c.angularVelocity=angularVelocityBits.map(bitsFloat);
 const s=c.setup,started=startMcmDirectionalTrick(c),t=started||{...createMcmEventGraph(s),field820:c.field820,field710:c.field710,animation:c.animation,awardBase:c.awardBase,fieldb4c:c.fieldb4c,envelope:s.envelope,boundsMin:s.liveBoundsMin,boundsMax:s.liveBoundsMax,scratch540:s.scratch540,scratch54c:s.scratch54c,bikeAnimation:c.bikeAnimation,riderAnimation:c.riderAnimation},r={...t,triggered:c.state,eventKind:c.eventKind,reason:c.reason,otherPresent:c.otherPresent,field714:c.field714,velocity:c.velocity,angularVelocity:c.angularVelocity,randomCalls:0,inputCalls:0,state:c.state,direction:s.direction,inverted:s.inverted,field890:s.field890,resource:s.resource,rider:s.rider},expected=[r.triggered,r.eventKind,r.reason,r.otherPresent,r.field710,r.field714,...[...r.velocity,...r.angularVelocity].map(floatBits),r.randomCalls,r.inputCalls,r.state,r.field820,r.animation,...[...r.envelope,...r.direction].map(floatBits),r.inverted,floatBits(r.field890),r.resource,...[...r.boundsMin,...r.boundsMax,...r.scratch540,...r.scratch54c,...r.target.local,...r.target.world,...r.source.world].map(floatBits),r.source.cacheValid,r.target.cacheValid,...[...r.rider.velocity,...r.rider.angularVelocity,...r.rider.previousVelocity].map(floatBits),...r.rider.selected,r.rider.active13c,r.rider.active16c,r.rider.kind,...r.components.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...r.boundsChildren.flatMap(n=>[...n.forward,...n.up,...n.position].map(floatBits)),floatBits(t.awardBase),t.fieldb4c,...t.bikeAnimation,...t.riderAnimation,+!!started];
  assert.deepEqual(expected,outputBits);
  if(started)selected.add(started.animation);else skipped++;
 }
 assert.equal(selected.size,16);assert.ok(skipped>0);
});

test('bike input gates and aggregation match original results and ordered device polls',async()=>{
 const {queryMcmBikeInput}=await import('../src/physics/mcm/bike-input.js');
 const {bitsFloat}=await import('../src/physics/mcm/math.js');
 const outcomes=new Set(),devices=new Set();let negativeZero=0;
 for(const {input:c,engineBits,brakeBits,outputBits} of fixture('bike-input-wine11.json').fixtures){
  c.engineLevel=bitsFloat(engineBits);c.brake=bitsFloat(brakeBits);
  const r=queryMcmBikeInput(c);
  assert.deepEqual([r.value,r.polled.length,...r.polled.map(x=>x+1),...Array(6-r.polled.length).fill(0)],outputBits);
  outcomes.add(`${r.value}:${r.polled.length}`);for(const device of r.polled)devices.add(device);
  if(Object.is(c.engineLevel,-0)||Object.is(c.brake,-0))negativeZero++;
 }
 assert.equal(outcomes.size,13);assert.equal(devices.size,6);assert.ok(negativeZero>0);
});

test('nearby bike selection and iterator match original execution',async()=>{
 const {nextMcmBike,selectMcmNearbyBike}=await import('../src/physics/mcm/nearby-bike.js');
 const selectedIds=new Set();
 for(const {input:c,outputBits} of fixture('nearby-bike-wine11.json').fixtures){
  const world={...c,player:c.bikes[0],players:c.players.map(i=>c.bikes[i]??null),others:c.othersPresent?c.others.map(i=>c.bikes[i]??null):null};
  const next=nextMcmBike(world,c.cursor),selected=selectMcmNearbyBike(world,c.bikes[0]);
  assert.deepEqual([c.bikes.indexOf(next.bike)+1,next.cursor,c.bikes.indexOf(selected)+1],outputBits);
  selectedIds.add(outputBits[2]);
 }
 assert.equal(selectedIds.size,8);
});

test('connected nearby interaction angle and acceptance match original float bits',async()=>{
 const {nextMcmBike,evaluateMcmNearbyInteraction}=await import('../src/physics/mcm/nearby-bike.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const outcomes=new Set();
 for(const {input:c,outputBits} of fixture('nearby-interaction-wine11.json').fixtures){
  const world={...c,player:c.bikes[0],players:c.players.map(i=>c.bikes[i]??null),others:c.othersPresent?c.others.map(i=>c.bikes[i]??null):null};
  const next=nextMcmBike(world,c.cursor),r=evaluateMcmNearbyInteraction(world,c.bikes[0],c.heading,c.previousAngle);
  assert.deepEqual([c.bikes.indexOf(next.bike)+1,next.cursor,c.bikes.indexOf(r.bike)+1,floatBits(r.angle),+r.accepted],outputBits);
  outcomes.add(`${outputBits[2]}:${outputBits[4]}`);
 }
 assert.equal(outcomes.size,15);
});

test('animation seek and ordered bike child callbacks match original execution',async()=>{
 const {applyMcmAnimationChild,seekMcmAnimation}=await import('../src/physics/mcm/animation-seek.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const f=Math.fround;
 for(const {input:c,outputBits} of fixture('animation-seek-wine11.json').fixtures){
 const nodes=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
 nodes[0].parent=nodes[c.targetParent];nodes[c.targetParent].firstChild=nodes[0];
 if(c.bodyParent){nodes[1].parent=nodes[2];nodes[1].nextSibling=nodes[2].firstChild;nodes[2].firstChild=nodes[1];}
 const record={componentIndex:c.componentIndex,local:c.local,forward:[...c.forward],up:[...c.up],position:[...c.position]};
 const second={...record,local:!record.local,forward:[...c.up],up:[...c.forward]};
 if(c.frameCount%2===0)record.next=second;
 const components=[];components[c.componentIndex]={node:nodes[0],positionEnabled:c.positionEnabled};
 const frames=Array.from({length:c.frameCount},(_,j)=>({index:j,boundsMin:c.position.map((v,k)=>f(v+j*(k+1))),boundsMax:c.position.map((v,k)=>f(v+j*(k+4))),firstChild:j%3?record:null}));
 frames.forEach((frame,j)=>frame.next=frames[j+1]);
 const animation={frameCount:c.frameCount,firstFrame:frames[0]},object={};
 seekMcmAnimation(object,animation,c.fraction,child=>applyMcmAnimationChild(nodes[1],components,child));
 const expected=[...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...record.forward,...record.up].map(floatBits),object.frame.index,+(object.record===animation),...[...object.boundsMin,...object.boundsMax].map(floatBits),...[...second.forward,...second.up].map(floatBits)];
 assert.deepEqual(expected,outputBits);
 }
});

test('complete nearby interaction matches original state and animation mutations',async()=>{
 const {runNearbyTransitionCase}=await import('../scripts/mcm-reference/nearby-transition-case.mjs');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const outcomes=new Set();
 for(const {input:c,angularVelocityBits,outputBits} of fixture('nearby-transition-wine11.json').fixtures){
 c.angularVelocity=angularVelocityBits.map(bitsFloat);
 const s=c.setup,t=runNearbyTransitionCase(c),r={...t,triggered:c.state,eventKind:c.eventKind,reason:c.reason,otherPresent:c.otherPresent,field714:c.field714,velocity:c.velocity,angularVelocity:c.angularVelocity,randomCalls:0,inputCalls:0,state:c.state,direction:s.direction,inverted:s.inverted,field890:s.field890,resource:s.resource,rider:s.rider},expected=[r.triggered,r.eventKind,r.reason,r.otherPresent,r.field710,r.field714,...[...r.velocity,...r.angularVelocity].map(floatBits),r.randomCalls,r.inputCalls,r.state,r.field820,r.animation,...[...r.envelope,...r.direction].map(floatBits),r.inverted,floatBits(r.field890),r.resource,...[...r.boundsMin,...r.boundsMax,...r.scratch540,...r.scratch54c,...r.target.local,...r.target.world,...r.source.world].map(floatBits),r.source.cacheValid,r.target.cacheValid,...[...r.rider.velocity,...r.rider.angularVelocity,...r.rider.previousVelocity].map(floatBits),...r.rider.selected,r.rider.active13c,r.rider.active16c,r.rider.kind,...r.components.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...r.boundsChildren.flatMap(n=>[...n.forward,...n.up,...n.position].map(floatBits)),floatBits(t.awardBase),t.fieldb4c,...t.bikeAnimation,...t.riderAnimation,+!!t.nearby,floatBits(t.angle),t.field824>>>0,floatBits(t.lean),floatBits(t.progress),...t.riderBounds.map(floatBits)];
 assert.deepEqual(expected,outputBits);
 outcomes.add(`${!!t.nearby}:${t.accepted}:${1+c.trickIndex%8}`);
 }
 assert.equal(outcomes.size,24);
});

test('rider control flow matches original dispatch, pose and blend',async()=>{
 const {updateMcmRider}=await import('../src/physics/mcm/rider-update.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const outcomes=new Set();
 for(const {input:c,controlBits,outputBits} of fixture('rider-update-wine11.json').fixtures){
  c.control=bitsFloat(controlBits);const queries=[];let nearby=0,trick=0,reset=0;
  const r=updateMcmRider(c,{query(action){queries.push(action);return c.buttons[[9,6,7].indexOf(action)];},nearby(){nearby++;},trick(r,index){trick=index+1;},resetOrientation(){reset++;}});
  assert.deepEqual([...[r.blend,r.positivePeak,r.negativePeak,...r.envelope].map(floatBits),r.pose>>>0,floatBits(r.weight),r.nextPose>>>0,floatBits(r.secondaryWeight),r.enabled,r.fieldb4c,queries.length,...queries,...Array(3-queries.length).fill(0),nearby,trick,reset],outputBits);
  outcomes.add(`${nearby}:${trick}:${reset}`);
 }
 assert.equal(outcomes.size,19);
});

test('connected rider update matches original graph, input and animation effects',async()=>{
 const {runRiderStepCase}=await import('../scripts/mcm-reference/rider-step-case.mjs');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const tricks=new Set();let nearby=0;
 for(const {input:c,angularVelocityBits,controlBits,outputBits} of fixture('rider-step-wine11.json').fixtures){
 c.angularVelocity=angularVelocityBits.map(bitsFloat);c.riderControl.control=bitsFloat(controlBits);
 const s=c.setup,t=runRiderStepCase(c),r={...t,triggered:c.state,eventKind:c.eventKind,reason:c.reason,otherPresent:c.otherPresent,field714:c.field714,velocity:c.velocity,angularVelocity:c.angularVelocity,randomCalls:0,inputCalls:t.inputCalls,state:c.state,direction:s.direction,inverted:s.inverted,field890:s.field890,resource:s.resource,rider:s.rider},expected=[r.triggered,r.eventKind,r.reason,r.otherPresent,r.field710,r.field714,...[...r.velocity,...r.angularVelocity].map(floatBits),r.randomCalls,r.inputCalls,r.state,r.field820,r.animation,...[...r.envelope,...r.direction].map(floatBits),r.inverted,floatBits(r.field890),r.resource,...[...r.boundsMin,...r.boundsMax,...r.scratch540,...r.scratch54c,...r.target.local,...r.target.world,...r.source.world].map(floatBits),r.source.cacheValid,r.target.cacheValid,...[...r.rider.velocity,...r.rider.angularVelocity,...r.rider.previousVelocity].map(floatBits),...r.rider.selected,r.rider.active13c,r.rider.active16c,r.rider.kind,...r.components.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...r.boundsChildren.flatMap(n=>[...n.forward,...n.up,...n.position].map(floatBits)),floatBits(t.awardBase),t.fieldb4c,...t.bikeAnimation,...t.riderAnimation,+!!t.nearby,floatBits(t.angle),t.field824>>>0,floatBits(t.lean),floatBits(t.progress),...t.riderBounds.map(floatBits),...[t.blend,t.positivePeak,t.negativePeak,...t.envelope].map(floatBits),t.pose>>>0,floatBits(t.weight),t.nextPose>>>0,floatBits(t.secondaryWeight),...t.queries,...Array(3-t.queries.length).fill(0)];
 assert.deepEqual(expected,outputBits);
 if(t.field710&&t.inputCalls===3)tricks.add(t.animation);
 if(t.accepted)nearby++;
 }
 assert.equal(tricks.size,16);assert.ok(nearby>0);
});

test('orientation angle refresh matches original six float outputs',async()=>{
 const {extractMcmOrientationAngles}=await import('../src/physics/mcm/orientation-angles.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 for(const {input:c,outputBits} of fixture('orientation-angles-wine11.json').fixtures){
  assert.deepEqual(Object.values(extractMcmOrientationAngles(c.forward,c.up)).map(floatBits),outputBits);
 }
});

test('connected substep remainder and angle refresh match original execution',async()=>{
 const {finishMcmSubstep}=await import('../src/physics/mcm/substep-finish.js');
 const {floatBits,bitsFloat}=await import('../src/physics/mcm/math.js');
 const outcomes=new Set();
 for(const {input:c,carryBits,outputBits} of fixture('substep-finish-wine11.json').fixtures){
  c.carry=bitsFloat(carryBits);
  const r=finishMcmSubstep({...c,local:[1,0,0,0,...c.up,0,...c.forward,0,0,0,0,1]});
  assert.deepEqual([r.remaining>>>0,...[r.carry,r.dt,r.inverseDt,...r.forward,...r.up,r.yaw,r.pitch,r.roll,r.sinRoll,r.cosRoll,r.cosPitch].map(floatBits)],outputBits);
  outcomes.add(`${r.remaining}:${r.carry!==c.carry}`);
 }
 assert.equal(outcomes.size,5);
});

test('proxy world-matrix synchronization matches original transforms and caches',async()=>{
 const {synchronizeMcmProxyTransform}=await import('../src/physics/mcm/proxy-transform.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const layouts=new Set();
 for(const {input:c,outputBits} of fixture('proxy-transform-wine11.json').fixtures){
  const nodes=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
  if(c.targetParent>=0){nodes[0].parent=nodes[c.targetParent];nodes[c.targetParent].firstChild=nodes[0];}
  if(c.bodyParent){nodes[1].parent=nodes[2];nodes[1].nextSibling=nodes[2].firstChild;nodes[2].firstChild=nodes[1];}
  const copied=synchronizeMcmProxyTransform(nodes[1],nodes[0]);
  assert.deepEqual([...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...copied.map(floatBits)],outputBits);
  layouts.add(`${c.targetParent}:${c.bodyParent}`);
 }
 assert.equal(layouts.size,6);
});

test('collision center and grid lists match original mutations',async()=>{
 const {updateMcmCollisionGrid}=await import('../src/physics/mcm/collision-grid.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const corpus=fixture('collision-grid-wine11.json');
 assert.equal(corpus.source.integerBoundaryCases,90);
 for(const {input:c,outputBits} of corpus.fixtures){
 const cells=Array.from({length:65},(_,i)=>({id:1000+i})),markers=Array.from({length:65},(_,i)=>({id:2000+i}));
 cells.forEach((cell,i)=>{cell.next=markers[i];markers[i].previous=cell;});
 const entries=c.oldCells.map((cell,i)=>({id:i+1,cell,active:c.active[i],owner:123,other:77+i}));
 for(const e of entries)if(e.active){let tail=cells[e.cell];while(tail.next)tail=tail.next;tail.next=e;e.previous=tail;}
 const object={...c,worldCenter:[...c.worldCenter],entries};updateMcmCollisionGrid(object,{...c,cells},c.enabled);
 const id=n=>n?.id||0;
 const expected=[...object.worldCenter.map(floatBits),...entries.flatMap(e=>[id(e.previous),id(e.next),e.owner,e.cell,e.other,e.active]),...cells.flatMap((cell,i)=>[id(cell.next),id(markers[i].previous),id(markers[i].next)])];
 assert.deepEqual(expected,outputBits);
 }
});

test('collision entry allocation matches original initialized state and links',async()=>{
 const {updateMcmCollisionGrid}=await import('../src/physics/mcm/collision-grid.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 let allocated=0,skipped=0;
 for(const {input:c,outputBits} of fixture('collision-grid-allocation-wine11.json').fixtures){
 const cells=Array.from({length:65},(_,i)=>({id:1000+i})),markers=Array.from({length:65},(_,i)=>({id:2000+i}));
 cells.forEach((cell,i)=>{cell.next=markers[i];markers[i].previous=cell;});
 let entries=c.fresh?null:c.oldCells.map((cell,i)=>({id:i+1,cell,active:c.active[i],owner:123,other:77+i}));
 for(const e of entries||[])if(e.active){let tail=cells[e.cell];while(tail.next)tail=tail.next;tail.next=e;e.previous=tail;}
 const object={...c,owner:123,worldCenter:[...c.worldCenter],entries};updateMcmCollisionGrid(object,{...c,cells},c.enabled);
 entries=object.entries||[];entries.forEach((e,i)=>e.id=i+1);
 const id=n=>n?.id||0;
 const expected=[...object.worldCenter.map(floatBits),...entries.flatMap(e=>[id(e.previous),id(e.next),e.owner,c.fresh&&!e.active?0:e.cell,e.other,e.active]),...Array((4-entries.length)*6).fill(0),...cells.flatMap((cell,i)=>[id(cell.next),id(markers[i].previous),id(markers[i].next)]),entries.length];
 assert.deepEqual(expected,outputBits);
 if(c.fresh&&entries.length)allocated++;
 if(c.fresh&&!entries.length)skipped++;
 }
 assert.ok(allocated>0);assert.ok(skipped>0);
});

test('type 3/4 collision line traversal matches original ordered lists',async()=>{
 const {updateMcmCollisionGrid}=await import('../src/physics/mcm/collision-grid.js');
 for(const type of [3,4])for(const {input:c,outputBits} of fixture('collision-line-grid-wine11.json').fixtures){
 const cells=Array.from({length:65},(_,k)=>({owner:(k+c.headerSeed)%7===0?123:900}));
 cells.forEach((cell,k)=>{let tail=cell;for(let j=0;j<c.markers;j++){const e={owner:(k+j+c.ownerSeed)%3===0?123:500+j,other:77+j,active:2,previous:tail};tail.next=e;tail=e;}});
 const object={type,owner:123,start:c.start,end:c.end,entries:null};updateMcmCollisionGrid(object,{...c,cells},c.enabled);
 const expected=[];let inserted=0;
 for(const cell of cells){const words=[];let previous=cell;for(let e=cell.next;e;e=e.next){if(e.previous!==previous)throw new Error('Broken previous');words.push(e.owner,e.other,e.active);if(e.active===1)inserted++;previous=e;}expected.push(words.length/3,...words,...Array(18-words.length).fill(0));}
 expected.push(0);
 assert.deepEqual(expected,outputBits);
 }
});

test('collision dispatch matches original pair gates, contact copies and callback order',async()=>{
 const {dispatchMcmCollisions,testMcmSpherePair}=await import('../src/physics/mcm/collision-dispatch.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 for(const {input:c,outputBits} of fixture('collision-dispatch-wine11.json').fixtures){
 const calls=[],objects=c.objects.map((o,k)=>({...o,entries:k===0?c.entries:[],contactCC:[k*10,k*10+1,k*10+2],contactD8:[k*10+3,k*10+4,k*10+5],contactE4:[k*10+6,k*10+7,k*10+8],onPrimary:o.primary?()=>calls.push(100+k):null,onSecondary:o.secondary?()=>calls.push(200+k):null}));
 const nodes=c.owners.map(owner=>({owner}));nodes.forEach((node,k)=>{if(k%4!==3)node.next=nodes[k+1];});
 const m={objects,cells:[{next:nodes[0]},{next:nodes[4]}],pairs:c.pairs.map(row=>[...row]),enabled:c.enabled,depth:c.depth,contactCC:[1000,1001,1002],contactD8:[1003,1004,1005],contactE4:[1006,1007,1008],otherE4:[1009,1010,1011]};
 dispatchMcmCollisions(m,0,testMcmSpherePair);
 const expected=[...objects.flatMap(o=>[objects.indexOf(o.other)+1,...[...o.contactCC,...o.contactD8,...o.contactE4].map(floatBits)]),...m.pairs.flat(),floatBits(m.depth),m.currentA===undefined?0:m.currentA+1,m.currentB===undefined?0:m.currentB+1,calls.length,...calls,...Array(6-calls.length).fill(0)];
 assert.deepEqual(expected,outputBits);
 }
});

test('ellipsoid contact matches original full 3D orientation, depth and twelve contact words',async()=>{
 const {testMcmEllipsoidPair}=await import('../src/physics/mcm/collision-ellipsoid.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 for(const {input:c,outputBits} of fixture('collision-ellipsoid-wine11.json').fixtures){
 const m={depth:1000,contactCC:[1001,1002,1003],contactD8:[1004,1005,1006],contactE4:[1007,1008,1009],otherE4:[1010,1011,1012]};
 const hit=testMcmEllipsoidPair(m,...c.objects);
 assert.deepEqual([+hit,...[m.depth,...m.contactCC,...m.contactD8,...m.contactE4,...m.otherE4].map(floatBits)],outputBits);
 }
});

test('collision type routing matches original connected dispatch and intentional no-hit branches',async()=>{
 const {dispatchMcmCollisions,testMcmCollisionPrimitive}=await import('../src/physics/mcm/collision-dispatch.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 for(const {input:c,outputBits} of fixture('collision-routing-wine11.json').fixtures){
 const calls=[],objects=c.objects.map((o,k)=>({...o,matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],localCenter:o.worldCenter,extents:[o.radius,Math.fround(o.radius*.75),Math.fround(o.radius*.5)],entries:k===0?c.entries:[],contactCC:[k*10,k*10+1,k*10+2],contactD8:[k*10+3,k*10+4,k*10+5],contactE4:[k*10+6,k*10+7,k*10+8],onPrimary:o.primary?()=>calls.push(100+k):null,onSecondary:o.secondary?()=>calls.push(200+k):null}));
 const nodes=c.owners.map(owner=>({owner}));nodes.forEach((node,k)=>{if(k%4!==3)node.next=nodes[k+1];});
 const m={objects,cells:[{next:nodes[0]},{next:nodes[4]}],pairs:c.pairs.map(row=>[...row]),enabled:c.enabled,depth:c.depth,contactCC:[1000,1001,1002],contactD8:[1003,1004,1005],contactE4:[1006,1007,1008],otherE4:[1009,1010,1011]};
 dispatchMcmCollisions(m,0);
 const expected=[...objects.flatMap(o=>[objects.indexOf(o.other)+1,...[...o.contactCC,...o.contactD8,...o.contactE4].map(floatBits)]),...m.pairs.flat(),floatBits(m.depth),m.currentA===undefined?0:m.currentA+1,m.currentB===undefined?0:m.currentB+1,calls.length,...calls,...Array(6-calls.length).fill(0)];
 assert.deepEqual(expected,outputBits);
 }

});

test('horizontal and spatial line contacts match original mutations on hits and misses',async()=>{
 const {testMcmHorizontalLinePair,testMcmSpatialLinePair}=await import('../src/physics/mcm/collision-line.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 for(const {input:c,outputBits} of fixture('collision-line-wine11.json').fixtures){
 const m={depth:1000,contactCC:[1001,1002,1003],contactD8:[1004,1005,1006],contactE4:[1007,1008,1009],otherE4:[1010,1011,1012]};
 const hit=(c.line.type===3?testMcmHorizontalLinePair:testMcmSpatialLinePair)(m,c.line,c.body);
 assert.deepEqual([+hit,...[m.depth,...m.contactCC,...m.contactD8,...m.contactE4,...m.otherE4].map(floatBits)],outputBits);
 }
});

test('all original collision type combinations match connected dispatch',async()=>{
 const {dispatchMcmCollisions}=await import('../src/physics/mcm/collision-dispatch.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 const f=Math.fround;
 for(const {input:c,outputBits} of fixture('collision-routing-full-wine11.json').fixtures){
 const calls=[],objects=c.objects.map((o,k)=>({...o,radiusSquared:f(o.radius*o.radius),matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],localCenter:o.worldCenter,extents:[o.radius,Math.fround(o.radius*.75),Math.fround(o.radius*.5)],entries:k===0?c.entries:[],contactCC:[k*10,k*10+1,k*10+2],contactD8:[k*10+3,k*10+4,k*10+5],contactE4:[k*10+6,k*10+7,k*10+8],onPrimary:o.primary?()=>calls.push(100+k):null,onSecondary:o.secondary?()=>calls.push(200+k):null}));
 const nodes=c.owners.map(owner=>({owner}));nodes.forEach((node,k)=>{if(k%4!==3)node.next=nodes[k+1];});
 const m={objects,cells:[{next:nodes[0]},{next:nodes[4]}],pairs:c.pairs.map(row=>[...row]),enabled:c.enabled,depth:c.depth,contactCC:[1000,1001,1002],contactD8:[1003,1004,1005],contactE4:[1006,1007,1008],otherE4:[1009,1010,1011]};
 dispatchMcmCollisions(m,0);
 const expected=[...objects.flatMap(o=>[objects.indexOf(o.other)+1,...[...o.contactCC,...o.contactD8,...o.contactE4].map(floatBits)]),...m.pairs.flat(),floatBits(m.depth),m.currentA===undefined?0:m.currentA+1,m.currentB===undefined?0:m.currentB+1,calls.length,...calls,...Array(6-calls.length).fill(0)];
 assert.deepEqual(expected,outputBits);
 }
});

test('single-body collision impulse matches original velocity, angular response and transform cache',async()=>{
 const {applyMcmCollisionImpulse}=await import('../src/physics/mcm/collision-impulse.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 for(const {input:c,outputBits} of fixture('collision-impulse-wine11.json').fixtures){
 const r=structuredClone(c);applyMcmCollisionImpulse(r);
 assert.deepEqual([...[...r.angularVelocity,...r.velocity,r.impulse,...r.transform.world].map(floatBits),r.transform.cacheValid],outputBits);
 }
});

test('paired-body collision impulse matches both original bodies and caches',async()=>{
 const {applyMcmPairedCollisionImpulse}=await import('../src/physics/mcm/collision-pair-impulse.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 for(const {input:c,outputBits} of fixture('collision-pair-impulse-wine11.json').fixtures){
 const r=structuredClone(c);applyMcmPairedCollisionImpulse(r);
 assert.deepEqual([...[...r.a.angularVelocity,...r.a.velocity,...r.b.angularVelocity,...r.b.velocity,r.impulse].map(floatBits),...r.a.transform.world.map(floatBits),r.a.transform.cacheValid,...r.b.transform.world.map(floatBits),r.b.transform.cacheValid],outputBits);
 }
});

test('bike collision wrapper matches original state selection, local lever and world angular refresh',async()=>{
 const {applyMcmBikeCollisionImpulse}=await import('../src/physics/mcm/bike-collision-impulse.js');
 const {floatBits}=await import('../src/physics/mcm/math.js');
 for(const {input:c,outputBits} of fixture('bike-collision-impulse-wine11.json').fixtures){
 const r=structuredClone(c);applyMcmBikeCollisionImpulse(r,r);
 assert.deepEqual([...[...r.angularVelocity,...r.velocity,...r.worldAngularVelocity,...r.field654,...r.transform.world].map(floatBits),r.transform.cacheValid],outputBits);
 }
});

test('connected static collision response matches original bike, proxy and grid mutations',async()=>{
 const {evaluateStaticCollision}=await import('../scripts/mcm-reference/static-collision-response-case.mjs');
 for(const {input:c,outputBits} of fixture('static-collision-response-wine11.json').fixtures)assert.deepEqual(evaluateStaticCollision(c),outputBits);
});

test('connected dynamic collision response matches original bike, rider, proxy and grid mutations',async()=>{
 const {evaluateDynamicCollision}=await import('../scripts/mcm-reference/dynamic-collision-response-case.mjs');
 for(const {input:c,outputBits} of fixture('dynamic-collision-response-wine11.json').fixtures)assert.deepEqual(evaluateDynamicCollision(c),outputBits);
});

test('collision callbacks match original gates, tag mutation and ordered boundary calls',async()=>{
 const {evaluateCollisionCallback}=await import('../scripts/mcm-reference/collision-callback-case.mjs');
 for(const {input:c,outputBits} of fixture('collision-callback-wine11.json').fixtures)assert.deepEqual(evaluateCollisionCallback(c),outputBits);
});

test('collision callbacks connected to dynamic response match original physics and grid mutations',async()=>{
 const {evaluateConnectedCollisionCallback}=await import('../scripts/mcm-reference/connected-collision-callback-case.mjs');
 for(const {input:c,outputBits} of fixture('connected-collision-callback-wine11.json').fixtures)assert.deepEqual(evaluateConnectedCollisionCallback(c),outputBits);
});

test('collision response through final event matches original physics, transforms and rider transitions',async()=>{
 const {evaluateCollisionEvent}=await import('../scripts/mcm-reference/collision-event-case.mjs');
 for(const {input:c,outputBits} of fixture('collision-event-wine11.json').fixtures)assert.deepEqual(evaluateCollisionEvent(c),outputBits);
});

test('main-step collision phase matches original live dispatch, response, event and remainder mutations',async()=>{
 const {evaluateCollisionSubstep}=await import('../scripts/mcm-reference/collision-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('collision-substep-wine11.json').fixtures)assert.deepEqual(evaluateCollisionSubstep(c),outputBits);
});

test('two-bike collision substep matches original ordered responses and shared grid mutations',async()=>{
 const {evaluateBikePairSubstep}=await import('../scripts/mcm-reference/bike-pair-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('bike-pair-substep-wine11.json').fixtures)assert.deepEqual(evaluateBikePairSubstep(c),outputBits);
});

test('connected substep tail matches original post-event, collision, scheduling and orientation state',async()=>{
 const {evaluateSubstepTail}=await import('../scripts/mcm-reference/substep-tail-case.mjs');
 for(const {input:c,outputBits} of fixture('substep-tail-wine11.json').fixtures)assert.deepEqual(evaluateSubstepTail(c),outputBits);
});

test('connected substep start matches original throttle, brake, gears, input polling and acceleration filter',async()=>{
 const {evaluateSubstepStart}=await import('../scripts/mcm-reference/substep-start-case.mjs');
 for(const {input:c,outputBits} of fixture('substep-start-wine11.json').fixtures)assert.deepEqual(evaluateSubstepStart(c),outputBits);
});

test('connected substep start and contact transform preparation match original graph mutations',async()=>{
 const {evaluateContactPreparation}=await import('../scripts/mcm-reference/contact-preparation-case.mjs');
 for(const {input:c,outputBits} of fixture('contact-preparation-wine11.json').fixtures)assert.deepEqual(evaluateContactPreparation(c),outputBits);
});

test('wheel contact frame matches original terrain samples, radius offset and transform cache',async()=>{
 const {evaluateWheelContactFrame}=await import('../scripts/mcm-reference/wheel-contact-frame-case.mjs');
 for(const {input:c,outputBits} of fixture('wheel-contact-frame-wine11.json').fixtures)assert.deepEqual(evaluateWheelContactFrame(c),outputBits);
});

test('both wheel contacts match original rear frame, resamples and initial height differences',async()=>{
 const {evaluateWheelContactPair}=await import('../scripts/mcm-reference/wheel-contact-pair-case.mjs');
 for(const {input:c,outputBits} of fixture('wheel-contact-pair-wine11.json').fixtures)assert.deepEqual(evaluateWheelContactPair(c),outputBits);
});

test('complete wheel contact query matches original probe corrections and penetration selection',async()=>{
 const {evaluateWheelContacts}=await import('../scripts/mcm-reference/wheel-contacts-case.mjs');
 for(const {input:c,outputBits} of fixture('wheel-contacts-wine11.json').fixtures)assert.deepEqual(evaluateWheelContacts(c),outputBits);
});

test('main-substep wheel query matches original ordered transform reads and complete contacts',async()=>{
 const {evaluateSubstepWheelQuery}=await import('../scripts/mcm-reference/substep-wheel-query-case.mjs');
 for(const {input:c,outputBits} of fixture('substep-wheel-query-wine11.json').fixtures)assert.deepEqual(evaluateSubstepWheelQuery(c),outputBits);
});

test('bike reset matches original complete allocation writes, optional components and random draw count',async()=>{
 const {evaluateBikeReset}=await import('../scripts/mcm-reference/bike-reset-case.mjs');
 for(const {input:c,outputBits} of fixture('bike-reset-wine11.json').fixtures)assert.deepEqual(evaluateBikeReset(c),outputBits);
});

test('connected reset pose matches original vertical fallback, shared axes and transform graph mutations',async()=>{
 const {evaluateResetPose}=await import('../scripts/mcm-reference/reset-pose-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-pose-wine11.json').fixtures)assert.deepEqual(evaluateResetPose(c),outputBits);
});

test('connected reset terrain alignment matches original support selection and wheel-pivot rotations',async()=>{
 const {evaluateResetTerrain}=await import('../scripts/mcm-reference/reset-terrain-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-terrain-wine11.json').fixtures)assert.deepEqual(evaluateResetTerrain(c),outputBits);
});

test('alternate reset contact query matches original orientation extraction and complete wheel contacts',async()=>{
 const {evaluateResetContacts}=await import('../scripts/mcm-reference/reset-contacts-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-contacts-wine11.json').fixtures)assert.deepEqual(evaluateResetContacts(c),outputBits);
});

test('alternate final contact correction matches original refreshed angles and wheel/reference positions',async()=>{
 const {evaluateResetContactFinish}=await import('../scripts/mcm-reference/reset-contact-finish-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-contact-finish-wine11.json').fixtures)assert.deepEqual(evaluateResetContactFinish(c),outputBits);
});

test('alternate reset bounds update matches original ordered child callbacks and transform invalidation',async()=>{
 const {evaluateResetBounds}=await import('../scripts/mcm-reference/reset-bounds-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-bounds-wine11.json').fixtures)assert.deepEqual(evaluateResetBounds(c),outputBits);
});

test('complete alternate reset matches original proxy, collision grid, saved position and final flags',async()=>{
 const {evaluateResetFull}=await import('../scripts/mcm-reference/reset-full-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-full-wine11.json').fixtures)assert.deepEqual(evaluateResetFull(c),outputBits);
});

test('main reset selection matches original mode branches, normalization and helper arguments',async()=>{
 const {evaluateResetSelection}=await import('../scripts/mcm-reference/reset-selection-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-selection-wine11.json').fixtures)assert.deepEqual(evaluateResetSelection(c),outputBits);
});

test('reset course helper matches original nearby-bike avoidance, terrain limits and heading changes',async()=>{
 const {evaluateResetCourse}=await import('../scripts/mcm-reference/reset-course-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-course-wine11.json').fixtures)assert.deepEqual(evaluateResetCourse(c),outputBits);
});

test('terrain reset selection matches original five supports, target local position and real avoidance',async()=>{
 const {evaluateResetTerrainSelection}=await import('../scripts/mcm-reference/reset-terrain-selection-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-terrain-selection-wine11.json').fixtures)assert.deepEqual(evaluateResetTerrainSelection(c),outputBits);
});

test('main reset selection with real terrain and course helpers matches original connected execution',async()=>{
 const {evaluateResetSelectionConnected}=await import('../scripts/mcm-reference/reset-selection-connected-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-selection-connected-wine11.json').fixtures)assert.deepEqual(evaluateResetSelectionConnected(c),outputBits);
});

test('continuous main reset branch matches original complete reset, aliased heights and post-reset controls',async()=>{
 const {evaluateResetSubstep}=await import('../scripts/mcm-reference/reset-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('reset-substep-wine11.json').fixtures)assert.deepEqual(evaluateResetSubstep(c),outputBits);
});

test('ordinary contact branch matches original component rotation, cache invalidation and cooldown',async()=>{
 const {evaluateContactSubstep}=await import('../scripts/mcm-reference/contact-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('contact-substep-wine11.json').fixtures)assert.deepEqual(evaluateContactSubstep(c),outputBits);
});

test('connected ordinary force preparation matches original contacts, drag and alignment',async()=>{
 const {evaluateContactForceSubstep}=await import('../scripts/mcm-reference/contact-force-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('contact-force-substep-wine11.json').fixtures)assert.deepEqual(evaluateContactForceSubstep(c),outputBits);
});

test('connected contact roll matches original projection, trigonometry and steering blend',async()=>{
 const {evaluateContactRollSubstep}=await import('../scripts/mcm-reference/contact-roll-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('contact-roll-substep-wine11.json').fixtures)assert.deepEqual(evaluateContactRollSubstep(c),outputBits);
});

test('connected contact geometry matches original post-rotation mount reads, wheel levers and axis',async()=>{
 const {evaluateContactGeometrySubstep}=await import('../scripts/mcm-reference/contact-geometry-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('contact-geometry-substep-wine11.json').fixtures)assert.deepEqual(evaluateContactGeometrySubstep(c),outputBits);
});

test('connected chassis probes match original terrain contacts and preserved skipped controls',async()=>{
 const {evaluateChassisProbesSubstep}=await import('../scripts/mcm-reference/chassis-probes-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('chassis-probes-substep-wine11.json').fixtures)assert.deepEqual(evaluateChassisProbesSubstep(c),outputBits);
});

test('connected contact response matches original crash steering, transforms and landing flags',async()=>{
 const {evaluateContactResponseSubstep}=await import('../scripts/mcm-reference/contact-response-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('contact-response-substep-wine11.json').fixtures)assert.deepEqual(evaluateContactResponseSubstep(c),outputBits);
});

test('connected balance matches original takeoff state, weight filtering and force reference position',async()=>{
 const {evaluateContactBalanceSubstep}=await import('../scripts/mcm-reference/contact-balance-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('contact-balance-substep-wine11.json').fixtures)assert.deepEqual(evaluateContactBalanceSubstep(c),outputBits);
});

test('connected front suspension matches original reference transforms, travel and descendant caches',async()=>{
 const {evaluateFrontSuspensionSubstep}=await import('../scripts/mcm-reference/front-suspension-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('front-suspension-substep-wine11.json').fixtures)assert.deepEqual(evaluateFrontSuspensionSubstep(c),outputBits);
});

test('connected front load matches original steering correction, contact arm and shared force',async()=>{
 const {evaluateFrontLoadSubstep}=await import('../scripts/mcm-reference/front-load-substep-case.mjs');
 for(const {input:c,outputBits} of fixture('front-load-substep-wine11.json').fixtures)assert.deepEqual(evaluateFrontLoadSubstep(c),outputBits);
});

test('connected front velocity and tire force match original speed gates, projection and friction',async()=>{
 const {evaluateFrontVelocitySubstep}=await import('../scripts/mcm-reference/front-velocity-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('front-velocity-substep-wine11.json').fixtures.entries()){const actual=evaluateFrontVelocitySubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected rear suspension and drive match original rear-only entry, rotation and force',async()=>{
 const {evaluateRearSuspensionSubstep}=await import('../scripts/mcm-reference/rear-suspension-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('rear-suspension-substep-wine11.json').fixtures.entries()){const actual=evaluateRearSuspensionSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected rear load and velocity match original force split, projection and combined motion',async()=>{
 const {evaluateRearMotionSubstep}=await import('../scripts/mcm-reference/rear-motion-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('rear-motion-substep-wine11.json').fixtures.entries()){const actual=evaluateRearMotionSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected rear traction and tire force match original scaling, arm selection and cleanup',async()=>{
 const {evaluateRearTireSubstep}=await import('../scripts/mcm-reference/rear-tire-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('rear-tire-substep-wine11.json').fixtures.entries()){const actual=evaluateRearTireSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected tire accumulation matches original aliased force limiting and torque sums',async()=>{
 const {evaluateTireAccumulationSubstep}=await import('../scripts/mcm-reference/tire-accumulation-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('tire-accumulation-substep-wine11.json').fixtures.entries()){const actual=evaluateTireAccumulationSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected braking matches original shared force budget, torque and airborne cleanup',async()=>{
 const {evaluateBrakingSubstep}=await import('../scripts/mcm-reference/braking-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('braking-substep-wine11.json').fixtures.entries()){const actual=evaluateBrakingSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected chassis contacts match original merging, contact velocity and penetration correction',async()=>{
 const {evaluateChassisContactSubstep}=await import('../scripts/mcm-reference/chassis-contact-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('chassis-contact-substep-wine11.json').fixtures.entries()){const actual=evaluateChassisContactSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected chassis response matches original contact-count angular response and crash damping',async()=>{
 const {evaluateChassisResponseSubstep}=await import('../scripts/mcm-reference/chassis-response-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('chassis-response-substep-wine11.json').fixtures.entries()){const actual=evaluateChassisResponseSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected chassis impulse matches original local velocity updates and low-speed stopping',async()=>{
 const {evaluateChassisImpulseSubstep}=await import('../scripts/mcm-reference/chassis-impulse-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('chassis-impulse-substep-wine11.json').fixtures.entries()){const actual=evaluateChassisImpulseSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected suspension forces match original lean gate, spring damping and airborne cleanup',async()=>{
 const {evaluateSuspensionForceSubstep}=await import('../scripts/mcm-reference/suspension-force-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('suspension-force-substep-wine11.json').fixtures.entries()){const actual=evaluateSuspensionForceSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected single-contact forces match original projection, pitch clips and drive torque',async()=>{
 const {evaluateSingleContactForceSubstep}=await import('../scripts/mcm-reference/single-contact-force-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('single-contact-force-substep-wine11.json').fixtures.entries()){const actual=evaluateSingleContactForceSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected paired-contact forces match original projection, sequential pitch clips and drive torque',async()=>{
 const {evaluatePairedContactForceSubstep}=await import('../scripts/mcm-reference/paired-contact-force-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('paired-contact-force-substep-wine11.json').fixtures.entries()){const actual=evaluatePairedContactForceSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected contact correction matches original angular acceleration, masks and transform invalidation',async()=>{
 const {evaluateContactCorrectionSubstep}=await import('../scripts/mcm-reference/contact-correction-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('contact-correction-substep-wine11.json').fixtures.entries()){const actual=evaluateContactCorrectionSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected angular integration matches original opposing torque, damping and corrected world caches',async()=>{
 const {evaluateAngularIntegrationSubstep}=await import('../scripts/mcm-reference/angular-integration-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('angular-integration-substep-wine11.json').fixtures.entries()){const actual=evaluateAngularIntegrationSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected linear integration matches original steering correction, speed, freeze and crash position updates',async()=>{
 const {evaluateLinearIntegrationSubstep}=await import('../scripts/mcm-reference/linear-integration-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('linear-integration-substep-wine11.json').fixtures.entries()){const actual=evaluateLinearIntegrationSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected wheel and body transforms match original rotations, aliases and cache invalidation',async()=>{
 const {evaluateMotionTransformSubstep}=await import('../scripts/mcm-reference/motion-transform-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('motion-transform-substep-wine11.json').fixtures.entries()){const actual=evaluateMotionTransformSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected controller handoff and crash orientation match original transitions, aliases and normal-axis rotation',async()=>{
 const {evaluateControllerHandoffSubstep}=await import('../scripts/mcm-reference/controller-handoff-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('controller-handoff-substep-wine11.json').fixtures.entries()){const actual=evaluateControllerHandoffSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});


test('connected normal controls match original airborne input, velocity redirection and angular damping',async()=>{
 const {evaluateNormalControlSubstep}=await import('../scripts/mcm-reference/normal-control-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('normal-control-substep-wine11.json.gz').fixtures.entries()){const actual=evaluateNormalControlSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});


test('connected normal rotation matches original timer phases, normalized input and pivot transforms',async()=>{
 const {evaluateNormalRotationSubstep}=await import('../scripts/mcm-reference/normal-rotation-substep-case.mjs');
 for(const [i,{input:c,outputBits}] of fixture('normal-rotation-substep-wine11.json.gz').fixtures.entries()){const actual=evaluateNormalRotationSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});


test('connected grounded alignment matches original limits, world caches and pivot rotations',async()=>{
 const {evaluateNormalAlignmentSubstep}=await import('../scripts/mcm-reference/normal-alignment-substep-case.mjs');
 const corpus=fixture('normal-alignment-substep-wine11.json.gz');
 for(const gate of ['active=false','active=true:mask=0','active=true:mask=1:both=1','active=true:mask=1:both=0','active=true:mask=2','active=true:mask=3',':cache=1'])assert.ok(Object.keys(corpus.source.alignmentOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateNormalAlignmentSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});


test('connected normal event decisions match original triggers and preserve skipped crash state',async()=>{
 const {evaluateNormalEventDecisionSubstep}=await import('../scripts/mcm-reference/normal-event-decision-substep-case.mjs');
 const corpus=fixture('normal-event-decision-substep-wine11.json.gz');
 for(const reason of [1,2,4,5,6,7,8,9,12])assert.ok(Object.keys(corpus.source.eventOutcomes).some(k=>k.includes('triggered=1:')&&k.includes(`:reason=${reason}:`)),`reason ${reason}`);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateNormalEventDecisionSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});


test('connected event setup matches original orientation reset, rider state and random selections',async()=>{
 const {evaluateNormalEventSetupSubstep}=await import('../scripts/mcm-reference/normal-event-setup-substep-case.mjs');
 const corpus=fixture('normal-event-setup-substep-wine11.json.gz');
 for(const gate of ['triggered=0','triggered=1:reset=false','triggered=1:reset=true:parented=false','triggered=1:reset=true:parented=true',':sourceAlias=true:',':kind=2:',':draws=5'])assert.ok(Object.keys(corpus.source.setupOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateNormalEventSetupSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});


test('connected event children match original ordered callbacks and nested component transforms',async()=>{
 const {evaluateNormalEventChildrenSubstep}=await import('../scripts/mcm-reference/normal-event-children-substep-case.mjs');
 const corpus=fixture('normal-event-children-substep-wine11.json.gz');
 for(const gate of ['active=false','active=true:count=0','active=true:count=1','active=true:count=2','active=true:count=3',':local=0,1,0:',':local=1,0,1:',':nested=true',':nested=false'])assert.ok(Object.keys(corpus.source.childOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateNormalEventChildrenSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});


test('connected post-event joins match original rider gate and call arguments',async()=>{
 const {evaluateNormalEventJoinSubstep}=await import('../scripts/mcm-reference/normal-event-join-substep-case.mjs');
 const corpus=fixture('normal-event-join-substep-wine11.json.gz');
 for(const gate of ['event=1:',':called=0:',':called=1:',':heightZero=true',':heightZero=false'])assert.ok(Object.keys(corpus.source.joinOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateNormalEventJoinSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});


test('connected rider body matches original pose, blend, input, trick and nearby transitions',async()=>{
 const {evaluateNormalRiderSubstep}=await import('../scripts/mcm-reference/normal-rider-substep-case.mjs');
 const corpus=fixture('normal-rider-substep-wine11.json.gz');
 for(const gate of ['called=0:','called=1:queries=0,0,0','called=1:queries=9,6,7',':animation=255:nearby=1',':animation=1:',':poseChanged=true:',':flags=16:flag=1',':flags=16:flag=2'])assert.ok(Object.keys(corpus.source.riderOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateNormalRiderSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});


test('connected post-event state matches original world angular velocity, awards and suspension history',async()=>{
 const {evaluatePostStateSubstep}=await import('../scripts/mcm-reference/post-state-substep-case.mjs');
 const corpus=fixture('post-state-substep-wine11.json.br');
 for(const gate of ['award=0:','award=1:suppress=0:scoreChanged=true','award=1:suppress=1:scoreChanged=false',':timerZero=false',':yawZero=true',':parented=true',':parented=false'])assert.ok(Object.keys(corpus.source.postOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluatePostStateSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected collision synchronization matches original proxy transforms and live grid links',async()=>{
 const {evaluateCollisionSyncSubstep}=await import('../scripts/mcm-reference/collision-sync-substep-case.mjs');
 const corpus=fixture('collision-sync-substep-wine11.json.br');
 for(const gate of ['present=0','present=1:grid=0','present=1:grid=1',':parent=true',':parent=false',':type=0',':type=1'])assert.ok(Object.keys(corpus.source.syncOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateCollisionSyncSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected static collision dispatch matches callbacks, event transitions and substep reset',async()=>{
 const {evaluateCollisionDispatchSubstep}=await import('../scripts/mcm-reference/collision-dispatch-substep-case.mjs');
 const corpus=fixture('collision-dispatch-substep-wine11.json.br');
 for(const gate of ['present=0',':skip=1:',':enabled=0:',':manager=0:',':callbacks=0:',':callbacks=1:prior=0:state=1:remaining=1',':callbacks=1:prior=0:state=0',':callbacks=1:prior=2:state=2'])assert.ok(Object.keys(corpus.source.dispatchOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateCollisionDispatchSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected substep finish matches original remainder scheduling and final orientation',async()=>{
 const {evaluateFinishedSubstep}=await import('../scripts/mcm-reference/finished-substep-case.mjs');
 const corpus=fixture('finished-substep-wine11.json.br');
 for(const gate of ['remaining=0:',':dtChanged=true:',':dtChanged=false:',':forwardInvalid=true',':forwardInvalid=false'])assert.ok(Object.keys(corpus.source.finishOutcomes).some(k=>k.includes(gate)),gate);
 for(const bits of [0,0x38d1b716,0x38d1b717,0x38d1b718,0x3f000000,0xbf000000])assert.ok(corpus.fixtures.some(({input:c})=>floatBits(c.normalEventJoin.delay)===bits),`carry ${bits.toString(16)}`);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateFinishedSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected ordinary entry matches suspension resets and balance-reference refresh',async()=>{
 const {evaluatePreparedSubstep}=await import('../scripts/mcm-reference/prepared-substep-case.mjs');
 const corpus=fixture('prepared-substep-wine11.json.br');
 for(const gate of ['frontRearAlias=true','frontRearAlias=false',':bodyAlias=true',':balanceAlias=true',':parented=true',':parented=false'])assert.ok(Object.keys(corpus.source.preparationOutcomes).some(k=>k.includes(gate)),gate);
 for(const gate of ['called=1:queries=9,6,7',':animation=255:nearby=1',':animation=1:'])assert.ok(Object.keys(corpus.source.riderOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluatePreparedSubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('connected engine entry matches throttle, gears and their downstream physics effects',async()=>{
 const {evaluateEngineEntrySubstep}=await import('../scripts/mcm-reference/engine-entry-substep-case.mjs');
 const corpus=fixture('engine-entry-substep-wine11.json.br');
 assert.ok(corpus.fixtures.every(({outputBits})=>outputBits.length===976),'includes pre-branch scratch observation');
 assert.ok(corpus.fixtures.some(({outputBits})=>outputBits.slice(964).every(v=>v!==0)),'nonzero scratch survives common preparation');
 for(const gate of [':shift=-1:',':shift=1:',':polls=5,4:','analog=true','analog=false',':stopped=true',':stopped=false'])assert.ok(Object.keys(corpus.source.engineOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateEngineEntrySubstep(c);assert.deepEqual(actual,outputBits,`fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j])}`);}
});

test('common suspension preparation feeds the original complete reset branch',async()=>{
 const {evaluatePreparedResetSubstep}=await import('../scripts/mcm-reference/prepared-reset-substep-case.mjs');
 const corpus=fixture('prepared-reset-substep-wine11.json.br');
 for(const gate of ['frontRearAlias=true','frontRearAlias=false',':bodyAlias=true',':bodyAlias=false',':referenceAlias=true',':referenceAlias=false',':parented=true',':parented=false',':mode=0:',':mode=1:',':mode=2:',':mode=3:',':mode=4:',':mode=-1:'])assert.ok(Object.keys(corpus.source.preparationOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluatePreparedResetSubstep(c),outputBits,`reset fixture ${i}`);
});

test('reset output feeds common force preparation, contact geometry and chassis response',async()=>{
 const {evaluateResetContactResponse}=await import('../scripts/mcm-reference/reset-contact-response-case.mjs');
 const corpus=fixture('reset-contact-response-wine11.json.br');
 for(const gate of ['contacts=1,0:','contacts=0,1:',':probed=true',':probed=false',':frontProbe=0:',':frontProbe=1:',':frontProbe=2:',':bodyProbe=0:',':bodyProbe=1:',':frontMountBodyAlias=true',':frontMountBodyAlias=false'])assert.ok(Object.keys(corpus.source.contactOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetContactResponse(c),outputBits,`reset/contact fixture ${i}`);
});

test('reset output feeds balance weights, front tire loading and both suspension branches',async()=>{
 const {evaluateResetSuspension}=await import('../scripts/mcm-reference/reset-suspension-case.mjs');
 const corpus=fixture('reset-suspension-wine11.json.br');
 for(const gate of ['neutralLean=true','neutralLean=false',':filterStep=short:',':filterStep=equal:',':filterStep=long:',':front=1:rear=0:',':front=0:rear=1:',':frontLimited=0:',':frontLimited=1:',':rearLimited=0:',':rearLimited=1:',':weighted=true',':weighted=false'])assert.ok(Object.keys(corpus.source.balanceSuspensionOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetSuspension(c),outputBits,`reset/suspension fixture ${i}`);
});

test('reset output flows through rear traction, combined forces and chassis impulse',async()=>{
 const {evaluateResetChassisImpulse}=await import('../scripts/mcm-reference/reset-chassis-impulse-case.mjs');
 const corpus=fixture('reset-chassis-impulse-wine11.json.br');
 for(const gate of ['enabled=0:','enabled=1:count=2:','enabled=1:count=3:',':angularChanged=true',':angularChanged=false'])assert.ok(Object.keys(corpus.source.chassisOutcomes).some(k=>k.includes(gate)),gate);
 for(const gate of ['rear=1:driveZero=true:maxSpeedPositive=true','rear=1:driveZero=true:maxSpeedPositive=false','rear=0:driveZero=false',':factorNegative=true',':factorNegative=false'])assert.ok(Object.keys(corpus.source.tractionOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetChassisImpulse(c),outputBits,`reset/impulse fixture ${i}`);
});

test('reset forces integrate angular/linear motion and update the live transform graph',async()=>{
 const {evaluateResetMotionTransform}=await import('../scripts/mcm-reference/reset-motion-transform-case.mjs');
 const corpus=fixture('reset-motion-transform-wine11.json.br');
 for(const gate of ['mask=1:','mask=2:',':counter=true:',':counter=false:',':moving=true:',':largeAngle=true:',':largeAngle=false:',':zeroAngle=true:',':zeroAngle=false:',':bodyWheelAlias=true:',':bodyWheelAlias=false:',':wheelAlias=true',':wheelAlias=false'])assert.ok(Object.keys(corpus.source.motionOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetMotionTransform(c),outputBits,`reset/motion fixture ${i}`);
});

test('reset motion follows grounded alignment and limited-contact gates from the original',async()=>{
 const {evaluateResetAlignment}=await import('../scripts/mcm-reference/reset-alignment-case.mjs');
 const corpus=fixture('reset-alignment-wine11.json.br');
 for(const gate of ['limited=true:', 'limited=false:', ':mask=1:', ':mask=2:', ':localChanged=true:', ':localChanged=false:'])assert.ok(Object.keys(corpus.source.alignmentOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetAlignment(c),outputBits,`reset/alignment fixture ${i}`);
});

test('reset alignment reaches original launch, suppression and crash event decisions',async()=>{
 const {evaluateResetEventDecision}=await import('../scripts/mcm-reference/reset-event-decision-case.mjs');
 const corpus=fixture('reset-event-decision-wine11.json.br');
 for(const gate of ['triggered=0:', 'triggered=1:', ':reason=12:', ':reason=4:', ':reason=5:', ':reason=6:', ':reason=7:', ':inputCalls=0:', ':inputCalls=1:', ':randomCalls=0:', ':randomCalls=2:', ':suppressed=true:', ':suppressed=false:', ':limited=true', ':limited=false'])assert.ok(Object.keys(corpus.source.eventOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetEventDecision(c),outputBits,`reset/event fixture ${i}`);
});

test('reset events initialize the original rider controller and preserve skipped state',async()=>{
 const {evaluateResetEventSetup}=await import('../scripts/mcm-reference/reset-event-setup-case.mjs');
 const corpus=fixture('reset-event-setup-wine11.json.br');
 for(const gate of ['triggered=0:state=0:', 'triggered=1:state=1:', ':firstEmpty=true:', ':firstEmpty=false:', ':pitchFloor=true:', ':pitchFloor=false:', ':randomCalls=0:', ':randomCalls=2:', ':randomCalls=3:', ':randomCalls=4:', ':randomCalls=5:', ':limited=true', ':limited=false'])assert.ok(Object.keys(corpus.source.setupOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetEventSetup(c),outputBits,`reset/rider setup fixture ${i}`);
});

test('reset event returns match remaining-step commitment and rider-call arguments',async()=>{
 const {evaluateResetEventJoin}=await import('../scripts/mcm-reference/reset-event-join-case.mjs');
 const corpus=fixture('reset-event-join-wine11.json.br');
 for(const gate of ['called=0:', 'called=1:', ':triggered=0:', ':triggered=1:flag=1:delayZero=true:', ':delayZero=false:', ':heightZero=true:', ':heightZero=false:', ':rear=0:', ':rear=1:', ':limited=true', ':limited=false'])assert.ok(Object.keys(corpus.source.joinOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetEventJoin(c),outputBits,`reset/event join fixture ${i}`);
});

test('reset calls execute the original grounded rider body and blend tail',async()=>{
 const {evaluateResetRider}=await import('../scripts/mcm-reference/reset-rider-case.mjs');
 const corpus=fixture('reset-rider-wine11.json.br');
 for(const gate of ['called=0:', 'called=1:gated=true:', 'called=1:gated=false:', ':pose=7:next=8:weightOne=true:', ':pose=7:next=8:weightOne=false:', ':blendZero=true:', ':blendZero=false:', ':rear=0', ':rear=1'])assert.ok(Object.keys(corpus.source.riderOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetRider(c),outputBits,`reset/rider fixture ${i}`);
});

test('reset rider state refreshes position, angular motion, history and live collision grids',async()=>{
 const {evaluateResetCollisionSync}=await import('../scripts/mcm-reference/reset-collision-sync-case.mjs');
 const corpus=fixture('reset-collision-sync-wine11.json.br');
 for(const gate of ['state=0:', 'state=1:', ':worldAngularNonzero=true:', ':worldAngularNonzero=false:', ':parented=true:', ':parented=false:', ':bodyWheelAlias=true:', ':bodyWheelAlias=false:', ':rear=0:', ':rear=1:'])assert.ok(Object.keys(corpus.source.postOutcomes).some(k=>k.includes(gate)),gate);
 for(const gate of ['present=true:', 'present=false:', ':enabled=true:', ':enabled=false:', ':proxyBodyAlias=true:', ':proxyBodyAlias=false:', ':proxyParented=true:', ':proxyParented=false:', ':active=0:', ':otherCleared=true'])assert.ok(Object.keys(corpus.source.syncOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetCollisionSync(c),outputBits,`reset/collision sync fixture ${i}`);
});

test('reset state reaches real wall dispatch, impulse and collision-induced events',async()=>{
 const {evaluateResetCollisionDispatch}=await import('../scripts/mcm-reference/reset-collision-dispatch-case.mjs');
 const corpus=fixture('reset-collision-dispatch-wine11.json.br');
 for(const gate of [':callbacks=0:', ':callbacks=1:', ':pair=0:', ':pair=1:', ':pair=3:', ':enabled=0:', ':enabled=1:', ':objectEnabled=0:', ':objectEnabled=1:', ':eventChanged=true', ':eventChanged=false'])assert.ok(Object.keys(corpus.source.dispatchOutcomes).some(k=>k.includes(gate)),gate);
 assert.equal(corpus.source.transitionCases,16);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetCollisionDispatch(c),outputBits,`reset/collision dispatch fixture ${i}`);
});

test('reset path completes substep scheduling and orientation refresh against original execution',async()=>{
 const {evaluateResetFinishedSubstep}=await import('../scripts/mcm-reference/reset-finished-substep-case.mjs');
 const corpus=fixture('reset-finished-substep-wine11.json.br');
 for(const gate of ['before=1:','before=2:','before=3:',':after=0:',':after=1:',':after=2:',':carryConsumed=true:',':carryConsumed=false:',':dtChanged=true:',':dtChanged=false:'])assert.ok(Object.keys(corpus.source.finishOutcomes).some(k=>k.includes(gate)),gate);
 assert.equal(corpus.source.transitionCases,16);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetFinishedSubstep(c),outputBits,`reset/finished substep fixture ${i}`);
});

test('engine input and filters remain connected through reset and completed substep',async()=>{
 const {evaluateResetEngineEntry}=await import('../scripts/mcm-reference/reset-engine-entry-case.mjs');
 const corpus=fixture('reset-engine-entry-wine11.json.br');
 for(const gate of ['analog=true:','analog=false:',':state=0:',':state=1:',':state=2:',':shift=-1:',':shift=1:',':polls=5,4:',':stopped=true',':stopped=false'])assert.ok(Object.keys(corpus.source.engineOutcomes).some(k=>k.includes(gate)),gate);
 assert.equal(Object.entries(corpus.source.dispatchOutcomes).filter(([k])=>k.endsWith('eventChanged=true')).reduce((n,[,v])=>n+v,0),16);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetEngineEntry(c),outputBits,`engine/reset fixture ${i}`);
});

test('reset loop-back preserves live bike, engine and filters into the next engine update',async()=>{
 const {evaluateResetLoopEntry}=await import('../scripts/mcm-reference/reset-loop-entry-case.mjs');
 const corpus=fixture('reset-loop-entry-wine11.json.br');
 for(const gate of ['looped=0:remaining=0:','looped=1:remaining=1:','looped=1:remaining=2:',':carryConsumed=true:',':carryConsumed=false:',':state=0:',':state=1:',':polls=5,4:',':stopped=true:',':stopped=false:',':filterChanged=true'])assert.ok(Object.keys(corpus.source.loopOutcomes).some(k=>k.includes(gate)),gate);
 assert.equal(Object.entries(corpus.source.loopOutcomes).filter(([k])=>k.startsWith('looped=1:')).reduce((n,[,v])=>n+v,0),8964);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetLoopEntry(c),outputBits,`reset/loop-entry fixture ${i}`);
});

test('reset loop-back carries live transforms through the next ordinary wheel-contact pass',async()=>{
 const {evaluateResetLoopContact}=await import('../scripts/mcm-reference/reset-loop-contact-case.mjs');
 const corpus=fixture('reset-loop-contact-wine11.json.br');
 for(const gate of ['looped=0:','looped=1:state=0:',':frontPositive=true:rearPositive=true:',':frontPositive=true:rearPositive=false:',':frontPositive=false:rearPositive=true:',':frontPositive=false:rearPositive=false:',':cooldownZero=true:',':cooldownZero=false:',':componentChanged=true',':componentChanged=false'])assert.ok(Object.keys(corpus.source.nextContactOutcomes).some(k=>k.includes(gate)),gate);
 assert.equal(Object.entries(corpus.source.loopOutcomes).filter(([k])=>k.startsWith('looped=1:')).reduce((n,[,v])=>n+v,0),8964);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetLoopContact(c),outputBits,`reset/loop-contact fixture ${i}`);
});

test('persistent reset loop state reaches second force preparation and chassis contact response',async()=>{
 const {evaluateResetLoopResponse}=await import('../scripts/mcm-reference/reset-loop-response-case.mjs');
 const corpus=fixture('reset-loop-response-wine11.json.br');
 for(const gate of ['looped=1:front=0:rear=0:','looped=1:front=1:rear=0:','looped=1:front=0:rear=1:','looped=1:front=1:rear=1:',':frontProbe=0:',':frontProbe=1:',':frontProbe=2:',':bodyProbe=0:',':bodyProbe=1:'])assert.ok(Object.keys(corpus.source.nextResponseOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetLoopResponse(c),outputBits,`reset/loop-response fixture ${i}`);
});

test('persistent second substep matches original suspension, drive, tire forces and braking',async()=>{
 const {evaluateResetLoopTireForces}=await import('../scripts/mcm-reference/reset-loop-tire-forces-case.mjs');
 const corpus=fixture('reset-loop-tire-forces-wine11.json.br');
 for(const gate of ['looped=1:front=0:rear=0:','looped=1:front=1:rear=0:','looped=1:front=0:rear=1:','looped=1:front=1:rear=1:',':airborne=1:',':airborne=0:',':driveZero=true:',':driveZero=false:'])assert.ok(Object.keys(corpus.source.nextTireOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries())assert.deepEqual(evaluateResetLoopTireForces(c),outputBits,`reset/loop-tire fixture ${i}`);
});

test('persistent second substep matches chassis impulse, force integration and motion transforms',async()=>{
 const {evaluateResetLoopMotion}=await import('../scripts/mcm-reference/reset-loop-motion-case.mjs');
 const corpus=fixture('reset-loop-motion-wine11.json.br');
 for(const gate of ['looped=1:enabled=0:','looped=1:enabled=1:',':mask=0:',':mask=1:',':mask=2:',':rotationZero=true',':rotationZero=false'])assert.ok(Object.keys(corpus.source.nextMotionOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){const actual=evaluateResetLoopMotion(c);assert.deepEqual(actual,outputBits,`reset/loop-motion fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);}
});

test('persistent second substep matches airborne control, rotation and grounded alignment',async()=>{
 const {evaluateResetLoopControls}=await import('../scripts/mcm-reference/reset-loop-controls-case.mjs');
 const corpus=fixture('reset-loop-controls-wine11.json.br');
 for(const gate of ['looped=0:',':route=1:',':route=2:',':route=3:'])assert.ok(Object.keys(corpus.source.nextControlsOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateResetLoopControls(c);
  assert.deepEqual(actual,outputBits,`reset/loop-controls fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});


test('persistent second substep matches event decision, rider initialization and join',async()=>{
 const {evaluateResetLoopEvent}=await import('../scripts/mcm-reference/reset-loop-event-case.mjs');
 const corpus=fixture('reset-loop-event-wine11.json.br');
 for(const gate of ['looped=0:','looped=1:exit=1:triggered=0:','looped=1:exit=2:triggered=0:','looped=1:exit=2:triggered=1:',':kind=1:',':kind=2:',':kind=3:',':kind=4:',':kind=5:',':randomCalls=2:',':randomCalls=3:',':remaining=2'])assert.ok(Object.keys(corpus.source.nextEventOutcomes).some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateResetLoopEvent(c);
  assert.deepEqual(actual,outputBits,`reset/loop-event fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});

test('persistent second substep matches rider input, all directional tricks and pose blending',async()=>{
 const {evaluateResetLoopRider}=await import('../scripts/mcm-reference/reset-loop-rider-case.mjs');
 const corpus=fixture('reset-loop-rider-wine11.json.br'),outcomes=Object.keys(corpus.source.nextRiderOutcomes);
 for(const gate of ['looped=0:',':called=1:',':queries=3:',':enabled=1:',':flag=1:',':flag=2:'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 for(let index=1;index<=16;index++)assert.ok(outcomes.some(k=>k.includes(`:trick=${index}:`)),`directional trick ${index-1}`);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateResetLoopRider(c);
  assert.deepEqual(actual,outputBits,`reset/loop-rider fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});


test('persistent second substep completes post-state, live collision dispatch and scheduling',async()=>{
 const {evaluateResetLoopFinish}=await import('../scripts/mcm-reference/reset-loop-finish-case.mjs');
 const corpus=fixture('reset-loop-finish-wine11.json.br'),outcomes=Object.keys(corpus.source.nextFinishedOutcomes);
 assert.equal(corpus.source.secondCollisionTransitionCases,8);
 for(const gate of ['looped=0:','looped=1:callbacks=0:',':callbacks=1:',':remaining=0:',':remaining=1:',':carryChanged=true:',':carryChanged=false:',':state=1:priorState=0:'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 assert.ok(outcomes.some(k=>k.startsWith('looped=1:callbacks=1:')&&k.includes(':state=1:priorState=0:')));
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateResetLoopFinish(c);
  assert.equal(actual.length,3994);
  assert.deepEqual(actual,outputBits,`reset/loop-finish fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});


test('second loop-back preserves live state into third engine and ordinary wheel contact',async()=>{
 const {evaluateResetThirdContact}=await import('../scripts/mcm-reference/reset-third-contact-case.mjs');
 const corpus=fixture('reset-third-contact-wine11.json.br'),outcomes=Object.keys(corpus.source.thirdContactOutcomes);
 for(const gate of ['looped=0:', 'looped=1:frontPositive=true:rearPositive=true:', 'looped=1:frontPositive=true:rearPositive=false:', 'looped=1:frontPositive=false:rearPositive=true:', 'looped=1:frontPositive=false:rearPositive=false:', ':nonfinitePoint=true:', ':axisZero=true', ':axisZero=false'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateResetThirdContact(c);
  assert.equal(actual.length,4213);
  assert.deepEqual(actual,outputBits,`reset/third-contact fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});


test('third persistent substep completes forces, motion, rider interaction and scheduling',async()=>{
 const {evaluateResetThirdFinish}=await import('../scripts/mcm-reference/reset-third-finish-case.mjs');
 const corpus=fixture('reset-third-finish-wine11.json.br'),outcomes=Object.keys(corpus.source.thirdFinishedOutcomes);
 assert.equal(corpus.source.totalDifferences,0);
 for(const gate of ['looped=0:', 'looped=1:route=1:', 'looped=1:route=2:', 'looped=1:route=3:', ':triggered=0:', ':triggered=1:', ':queries=3:', ':enabled=1:', ':nearbyRecord=true:', ':callbacks=1:', ':remaining=0', ':remaining=1'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateResetThirdFinish(c);
  assert.equal(actual.length,6062);
  assert.deepEqual(actual,outputBits,`reset/third-finish fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});


test('retained reset state exhausts the captured loop through up to four complete substeps',async()=>{
 const {evaluateResetLoopCompletion}=await import('../scripts/mcm-reference/reset-loop-completion-case.mjs');
 const corpus=fixture('reset-loop-completion-wine11.json.br'),outcomes=Object.keys(corpus.source.completionOutcomes);
 assert.equal(corpus.source.totalDifferences,0);
 for(const n of [1,2,3,4])assert.ok(outcomes.some(k=>k.includes(`iterations=${n}:`)),`iteration count ${n}`);
 assert.ok(outcomes.every(k=>k.endsWith(':remaining=0')));
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateResetLoopCompletion(c);
  assert.equal(actual.length,8130);
  assert.equal(actual[8114],0);
  assert.deepEqual(actual,outputBits,`reset/loop-completion fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});


test('post-loop frame acceleration uses retained velocity and the stored frame interval',async()=>{
 const {evaluateResetPostFilter}=await import('../scripts/mcm-reference/reset-post-filter-case.mjs');
 const corpus=fixture('reset-post-filter-wine11.json.br'),outcomes=Object.keys(corpus.source.postFilterOutcomes);
 assert.equal(corpus.source.totalDifferences,0);
 for(const gate of ['iterations=1:', 'iterations=2:', 'iterations=3:', 'iterations=4:', ':deltaZero=true:', ':deltaZero=false:', ':interval=short:', ':interval=equal:', ':interval=long:', ':finite=true:', ':finite=false:', ':parented=true:', ':parented=false:'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 for(const [i,{input:c,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateResetPostFilter(c);
  assert.equal(actual.length,8277);
  assert.equal(actual[8130],0);
  assert.deepEqual(actual,outputBits,`reset/post-filter fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});

test('frame-end crash animation matches original lean selection and live child transforms',async()=>{
 const {evaluateCrashFrameAnimation}=await import('../scripts/mcm-reference/crash-frame-animation-case.mjs');
 const {bitsFloat}=await import('../src/physics/mcm/math.js');
 const corpus=fixture('crash-frame-animation-wine11.json.br'),outcomes=Object.keys(corpus.source.outcomes);
 assert.equal(corpus.source.totalDifferences,0);
 for(const gate of ['state=1:', 'state=2:', 'state=3:', ':secondary=0:', ':secondary=1:', ':children=0:', ':children=1:', ':children=2:', ':weight=zero', ':weight=one', ':weight=middle'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 for(const [i,{input,angleBits,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateCrashFrameAnimation({...input,angle:bitsFloat(angleBits)});
  assert.equal(actual.length,120);
  assert.deepEqual(actual,outputBits,`crash/frame-animation fixture ${i}`);
 }
});

test('animation advancement retains timing, frames and blended/mirrored transforms across calls',async()=>{
 const {evaluateAnimationAdvance}=await import('../scripts/mcm-reference/animation-advance-case.mjs');
 const corpus=fixture('animation-advance-wine11.json.br'),outcomes=Object.keys(corpus.source.outcomes);
 assert.equal(corpus.source.totalDifferences,0);
 for(const gate of ['riderProxy=0:', 'riderProxy=1:', 'stopped=0:', 'stopped=1:', ':loop=0:', ':loop=1:', ':blend=0:', ':blend=1:', ':mirror=0:', ':mirror=1:', ':ended=0:', ':ended=1:', ':blendEnded=true', ':blendEnded=false'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 for(const [i,{input,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateAnimationAdvance(input);
  assert.equal(actual.length,552);
  assert.deepEqual(actual,outputBits,`animation/advance fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});

for(const [name,words] of [['animation-pose-blend',395],['animation-four-pose-blend',683]]){
 test(`${name} matches original frame selection, interpolation and graph mutations`,async()=>{
  const {evaluateAnimationPoseBlend}=await import('../scripts/mcm-reference/animation-pose-blend-case.mjs');
  const corpus=fixture(`${name}-wine11.json.br`),outcomes=Object.keys(corpus.source.outcomes);
  assert.equal(corpus.source.totalDifferences,0);
  for(const gate of ['rider=0:', 'rider=1:', ':position=0:', ':position=1:', ':mask=0:', ':blend=negative', ':blend=zero', ':blend=middle', ':blend=one', ':blend=excess'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
  for(let n=1;n<=8;n++)assert.ok(outcomes.some(k=>k.includes(`:frames=${n}:`)),`frame count ${n}`);
  if(words===683){
   for(let n=1;n<=8;n++)assert.ok(outcomes.some(k=>k.includes(`:thirdFrames=${n}:`)),`third frame count ${n}`);
   assert.ok(outcomes.some(k=>k.includes(':mask=255:')));
   assert.ok(corpus.fixtures.some(({input:c})=>c.secondaryBlend<0));
   assert.ok(corpus.fixtures.some(({input:c})=>c.secondaryBlend>1));
  }
  for(const [i,{input,outputBits}] of corpus.fixtures.entries()){
   const actual=evaluateAnimationPoseBlend(input);
   assert.equal(actual.length,words);
   assert.deepEqual(actual,outputBits,`${name} fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
  }
 });
}

test('normal frame-end rider poses and crash animation match original entry through return',async()=>{
 const {evaluateNormalFrameRider}=await import('../scripts/mcm-reference/normal-frame-rider-case.mjs');
 const corpus=fixture('normal-frame-rider-wine11.json.br'),outcomes=Object.keys(corpus.source.outcomes);
 assert.equal(corpus.source.totalDifferences,0);
 for(const gate of ['state=0:', 'state=1:', 'state=2:', 'state=3:', ':enabled=0:', ':enabled=1:', ':mask=0:', ':mask=3:', ':riderParent=0', ':riderParent=1'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 for(let pose=0;pose<=13;pose++)assert.ok(outcomes.some(k=>k.includes(`:pose=${pose}:`)),`pose ${pose}`);
 assert.ok(corpus.fixtures.some(({input:c})=>c.speedBits===0x80000000));
 for(const [i,{input,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateNormalFrameRider(input);
  assert.equal(actual.length,3247);
  assert.deepEqual(actual,outputBits,`normal/frame-rider fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});

test('frame-end trick holds and releases retain original input and animation state across calls',async()=>{
 const {evaluateTrickFrameRider}=await import('../scripts/mcm-reference/trick-frame-rider-case.mjs');
 const corpus=fixture('trick-frame-rider-wine11.json.br'),outcomes=Object.keys(corpus.source.outcomes);
 assert.equal(corpus.source.totalDifferences,0);
 for(let animation=0;animation<16;animation++)assert.ok(outcomes.some(k=>k.startsWith(`animation=${animation}:`)),`trick ${animation}`);
 for(const gate of [':ai=0:', ':ai=1:', ':secondary=0:', ':secondary=1:', ':loop=0:', ':loop=1:', ':queries=0:', ':queries=1:', ':queries=2:', ':frameUnchanged=true:', ':frameUnchanged=false:', ':stopped=0', ':stopped=1'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 assert.ok(corpus.fixtures.some(({input:c})=>c.holdTimeBits===0x80000000));
 assert.ok(corpus.fixtures.some(({input:c,outputBits:w})=>c.ai&&c.holdTime>0&&w[265]===0&&w[201]===c.initialFrame&&w[470]!==c.initialFrame),'AI timer expiry resumes animation on a later call');
 for(const [i,{input,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateTrickFrameRider(input);
  assert.equal(actual.length,1076);
  assert.deepEqual(actual,outputBits,`trick/frame-rider fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});

test('frame-end nearby interaction retains tracking, hold, return and normal-pose transitions',async()=>{
 const {evaluateNearbyFrameRider}=await import('../scripts/mcm-reference/nearby-frame-rider-case.mjs');
 const corpus=fixture('nearby-frame-rider-wine11.json.br'),outcomes=Object.keys(corpus.source.outcomes);
 assert.equal(corpus.source.totalDifferences,0);
 for(const gate of ['active=0:', 'active=1:', ':returning=0:', ':returning=1:', ':lean=-1:', ':lean=0:', ':lean=1:', ':ended=true:', ':ended=false:', ':normalLater=true:', ':normalLater=false:', ':mask=0:', ':mask=3:'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 assert.ok(corpus.fixtures.some(({input:c})=>c.leanBits===0x80000000));
 assert.ok(corpus.fixtures.some(({outputBits:w})=>w[3247]===0&&w[215]===14&&w[3469]!==14),'last interaction seek precedes normal posing on a later call');
 for(const [i,{input,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateNearbyFrameRider(input);
  assert.equal(actual.length,13016);
  assert.deepEqual(actual,outputBits,`nearby/frame-rider fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});

test('frame-end recovery retains animation time and restores orientation before normal posing',async()=>{
 const {evaluateRecoveryFrameRider}=await import('../scripts/mcm-reference/recovery-frame-rider-case.mjs');
 const corpus=fixture('recovery-frame-rider-wine11.json.br'),outcomes=Object.keys(corpus.source.outcomes);
 assert.equal(corpus.source.totalDifferences,0);
 for(const gate of ['stopped=0:', 'stopped=1:', ':loop=0:', ':loop=1:', ':resetFirst=true:', ':resetFirst=false:', ':resetLater=true:', ':resetLater=false:', ':mask=0:', ':mask=1:', ':parented=0', ':parented=1'])assert.ok(outcomes.some(k=>k.includes(gate)),gate);
 assert.ok(corpus.fixtures.some(({outputBits:w})=>w[206]===3&&w[207]===0&&w[3476]!==0),'orientation restoration precedes normal bike animation on a later call');
 for(const [i,{input,outputBits}] of corpus.fixtures.entries()){
  const actual=evaluateRecoveryFrameRider(input);
  assert.equal(actual.length,13076);
  assert.deepEqual(actual,outputBits,`recovery/frame-rider fixture ${i}, fields ${actual.flatMap((v,j)=>v===outputBits[j]?[]:[j]).join(',')}`);
 }
});

test('retained physics supplies the original frame-end rider entry state without reseeding',async()=>{
 const {evaluateResetPostFilter}=await import('../scripts/mcm-reference/reset-post-filter-case.mjs');
 const {frameRiderEntryWords}=await import('../scripts/mcm-reference/frame-rider-entry-case.mjs');
 const corpus=fixture('frame-rider-entry-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 for(const branch of ['crash','normal','recovery','trick','nearby'])assert.ok(corpus.fixtures.some(c=>c.key.startsWith(`${branch}:`)),branch);
 assert.ok(corpus.fixtures.some(c=>c.key.includes('finiteSpeed=false')));
 assert.ok(corpus.fixtures.some(c=>c.key.includes('finiteHeading=false')));
 for(const {caseIndex,input,outputBits} of corpus.fixtures){
  let actual,calls=0;
  evaluateResetPostFilter(input,c=>{calls++;actual=frameRiderEntryWords(c);});
  assert.equal(calls,1);
  assert.equal(actual.length,56);
  assert.deepEqual(actual,outputBits,`frame-rider entry case ${caseIndex}`);
 }
});

test('retained physics continues through the original frame-end rider return with live animation state',async()=>{
 const {evaluateResetFrameRider}=await import('../scripts/mcm-reference/reset-frame-rider-case.mjs');
 const corpus=fixture('reset-frame-rider-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.ok(corpus.source.rawDeltaDiffersFromStoredInterval>0);
 assert.ok(corpus.source.recovery.advance>0&&corpus.source.recovery.restart>0);
 for(const branch of ['crash','normal','recovery','trick','nearby'])assert.ok(corpus.fixtures.some(c=>c.key.startsWith(`${branch}:`)),branch);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetFrameRider(input);
  assert.equal(actual.prefix.length,8277);
  assert.equal(actual.tail.length,10954);
  assert.deepEqual(actual.prefix,prefixBits,`connected frame-rider prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`connected frame-rider tail ${caseIndex}`);
 }
});

test('retained physics executes the original caller tail and frame return',async()=>{
 const {evaluateResetFrameReturn}=await import('../scripts/mcm-reference/reset-frame-return-case.mjs');
 const corpus=fixture('reset-frame-return-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(Object.keys(corpus.source.returnGates).length,8);
 assert.ok(corpus.fixtures.some(c=>c.input.frameReturn.playerIsBike&&c.input.frameReturn.state===3&&!c.input.frameReturn.disabled));
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetFrameReturn(input);
  assert.equal(actual.tail.length,11097);
  assert.equal(actual.tail[11096],1);
  assert.deepEqual(actual.prefix,prefixBits,`frame return prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`frame return tail ${caseIndex}`);
 }
});


test('retained frame return enters the original next-frame scheduler without reseeding',async()=>{
 const {evaluateResetNextEntry}=await import('../scripts/mcm-reference/reset-next-entry-case.mjs');
 const corpus=fixture('reset-next-entry-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 for(const path of ['negative','capped','single','multiple'])assert.ok(Object.keys(corpus.source.schedules).some(k=>k.startsWith(`path=${path}:`)));
 for(const bits of [0,0x80000000])assert.ok(corpus.fixtures.some(c=>c.input.nextFrame.deltaBits===bits));
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextEntry(input);
  assert.equal(actual.tail.length,11248);
  assert.equal(actual.tail[11096],1);
  assert.deepEqual(actual.prefix,prefixBits,`next entry prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next entry tail ${caseIndex}`);
 }
});

test('retained next-frame recovery matches original animation and bounds transitions',async()=>{
 const {evaluateResetNextRecovery}=await import('../scripts/mcm-reference/reset-next-recovery-case.mjs');
 const corpus=fixture('reset-next-recovery-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 for(const branch of ['bypass','animate','restore'])assert.ok(corpus.source.entryRecovery[branch]);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextRecovery(input);
  assert.equal(actual.tail.length,11476);
  assert.equal(actual.tail[11475],0);
  assert.deepEqual(actual.prefix,prefixBits,`next recovery prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next recovery tail ${caseIndex}`);
 }
});

test('retained player input matches original axes, device curve and controller boundaries',async()=>{
 const {evaluateResetNextInput}=await import('../scripts/mcm-reference/reset-next-input-case.mjs');
 const corpus=fixture('reset-next-input-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 for(const branch of ['crash','player','ai','scripted'])assert.ok(corpus.source.inputBranches[branch]);
 for(const path of ['linear','cubic','analogEnabled','analogDisabled','trickReleased'])assert.ok(corpus.source.inputCoverage[path]);
 assert.ok(corpus.source.initialVariantCases>0);
 assert.equal(corpus.source.priorTraceComparedCases,17648);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextInput(input);
  assert.equal(actual.tail.length,11496);
  assert.equal(actual.tail[11476],['crash','player','ai','scripted'].indexOf(actual.inputBranch));
  assert.deepEqual(actual.prefix,prefixBits,`next input prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next input tail ${caseIndex}`);
 }
});

test('frame steering rate and longitudinal burst match isolated original execution',async()=>{
 const {evaluateFrameSteering}=await import('../scripts/mcm-reference/frame-steering-case.mjs');
 const corpus=fixture('frame-steering-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 for(const path of ['directLimit','reducedLimit','deadzone','nonzeroRate','burst','cappedBurst','zeroDelta','carryIncluded'])assert.ok(corpus.source.coverage[path]);
 for(const {input,outputBits} of corpus.fixtures)assert.deepEqual(evaluateFrameSteering(input),outputBits);
});

test('retained player steering setup preserves earlier frame observations',async()=>{
 const {evaluateResetNextSteering}=await import('../scripts/mcm-reference/reset-next-steering-case.mjs');
 const corpus=fixture('reset-next-steering-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextSteering(input);
  assert.equal(actual.tail.length,11516);
  assert.deepEqual(actual.prefix,prefixBits,`next steering prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next steering tail ${caseIndex}`);
 }
});

test('frame reset decision matches original reset, boundary and crash branches',async()=>{
 const {evaluateFrameResetDecision}=await import('../scripts/mcm-reference/frame-reset-decision-case.mjs');
 const corpus=fixture('frame-reset-decision-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 for(const branch of ['forced-position','elapsed','button','boundary','continue','crash-active','crash-expired','rider-inactive'])assert.ok(corpus.source.branches[branch]);
 for(const side of [1,2,3,4])assert.ok(corpus.source.boundarySides[side]);
 for(const {input,outputBits} of corpus.fixtures)assert.deepEqual(evaluateFrameResetDecision(input).words,outputBits);
});

test('retained next-frame reset decision preserves prior execution and rider state',async()=>{
 const {evaluateResetNextReset}=await import('../scripts/mcm-reference/reset-next-reset-case.mjs');
 const corpus=fixture('reset-next-reset-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 for(const branch of ['continue','crash-active','button','pending'])assert.ok(corpus.source.resetBranches[branch]);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextReset(input);
  assert.equal(actual.tail.length,11671);
  assert.deepEqual(actual.prefix,prefixBits,`next reset prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next reset tail ${caseIndex}`);
 }
});

test('retained next-frame terrain probes match original contact controls and transforms',async()=>{
 const {evaluateResetNextTerrain}=await import('../scripts/mcm-reference/reset-next-terrain-case.mjs');
 const corpus=fixture('reset-next-terrain-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 for(const count of [0,2,3])assert.ok(corpus.source.terrainCoverage[count]);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextTerrain(input);
  assert.equal(actual.tail.length,11832);
  assert.deepEqual(actual.prefix,prefixBits,`next terrain prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next terrain tail ${caseIndex}`);
 }
});

test('retained next-frame engine uses carried timing, input and filter state',async()=>{
 const {evaluateResetNextEngine}=await import('../scripts/mcm-reference/reset-next-engine-case.mjs');
 const corpus=fixture('reset-next-engine-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 for(const branch of ['executed','no-iterations','pending'])assert.ok(corpus.source.engineBranches[branch]);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextEngine(input);
  assert.equal(actual.tail.length,11884);
  assert.deepEqual(actual.prefix,prefixBits,`next engine prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next engine tail ${caseIndex}`);
 }
});

test('retained next-frame contacts distinguish completed resets from original avoidance cycles',async()=>{
 const {evaluateResetNextContact}=await import('../scripts/mcm-reference/reset-next-contact-case.mjs');
 const corpus=fixture('reset-next-contact-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 for(const branch of ['ordinary','reset','original-nonterminating','no-iterations','pending'])assert.ok(corpus.source.contactBranches[branch]);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextContact(input);
  assert.equal(actual.tail.length,12151);
  assert.deepEqual(actual.prefix,prefixBits,`next contact prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next contact tail ${caseIndex}`);
 }
});


test('retained next-frame contact response consumes the component limit and completed contacts',async()=>{
 const {evaluateResetNextResponse}=await import('../scripts/mcm-reference/reset-next-response-case.mjs');
 const corpus=fixture('reset-next-response-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextResponse(input);
  assert.equal(actual.responseReached,['ordinary','reset'].includes(actual.contactBranch));
  assert.equal(actual.tail.length,12353);
  assert.deepEqual(actual.prefix,prefixBits,`next response prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next response tail ${caseIndex}`);
 }
});

test('retained next-frame suspension, tire forces and motion consume the carried state',async()=>{
 const {evaluateResetNextMotion}=await import('../scripts/mcm-reference/reset-next-motion-case.mjs');
 const corpus=fixture('reset-next-motion-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 assert.equal(corpus.source.motionReachedCases,10896);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextMotion(input);
  assert.equal(actual.motionReached,['ordinary','reset'].includes(actual.contactBranch));
  assert.equal(actual.tail.length,12958);
  assert.deepEqual(actual.prefix,prefixBits,`next motion prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next motion tail ${caseIndex}`);
 }
});

test('retained next-frame controls and events preserve the crash bypass and supplied draw sequence',async()=>{
 const {evaluateResetNextEvent}=await import('../scripts/mcm-reference/reset-next-event-case.mjs');
 const corpus=fixture('reset-next-event-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 for(const route of [0,1,2,3,4])assert.ok(corpus.source.controlRoutes[route]);
 assert.equal(corpus.source.controlRoutes[4],8023);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextEvent(input);
  assert.equal(actual.eventReached,['ordinary','reset'].includes(actual.contactBranch));
  assert.equal(actual.tail.length,13316);
  assert.deepEqual(actual.prefix,prefixBits,`next event prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next event tail ${caseIndex}`);
 }
});

test('world angular rotation retains the original cancellation order',async()=>{
 const {rotateMcmWorldVector}=await import('../src/physics/mcm/collision-impulse.js');
 const m=Array(16).fill(0);
 m[1]=-0.7322028279304504;m[5]=0.6763883829116821;m[9]=0.079861119389534;
 const result=rotateMcmWorldVector(m,[9757560,10581852,-161890.21875]);
 // Original next-frame case 2825, bike+0x52c: (m[5]*y + m[9]*z) + m[1]*x.
 assert.equal(floatBits(result[1]),993072616);
});

test('retained next-frame rider, collisions and finish match original carried state',async()=>{
 const {evaluateResetNextFinish}=await import('../scripts/mcm-reference/reset-next-finish-case.mjs');
 const corpus=fixture('reset-next-finish-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 const coverage=Object.entries(corpus.source.finishCoverage);
 assert.equal(coverage.filter(([key])=>key.startsWith('callbacks=1:')).reduce((n,[,count])=>n+count,0),7);
 assert.equal(coverage.filter(([key])=>key.includes('carryConsumed=true')).reduce((n,[,count])=>n+count,0),988);
 assert.ok(corpus.fixtures.some(c=>c.caseIndex===2825));
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextFinish(input);
  assert.equal(actual.finishReached,['ordinary','reset'].includes(actual.contactBranch));
  assert.equal(actual.tail.length,14000);
  assert.deepEqual(actual.prefix,prefixBits,`next finish prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next finish tail ${caseIndex}`);
 }
});

test('retained second frame completes every scheduled and carry substep against original execution',async()=>{
 const {evaluateResetNextLoop}=await import('../scripts/mcm-reference/reset-next-loop-case.mjs');
 const corpus=fixture('reset-next-loop-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 for(const count of [0,1,2,3,4,5,6,7,9,10,11])assert.ok(corpus.source.loopCoverage[count]);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextLoop(input);
  assert.equal(actual.tail.length,35681);
  assert.equal(actual.finishReached,actual.loopCount>0);
  assert.deepEqual(actual.prefix,prefixBits,`next loop prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`next loop tail ${caseIndex}`);
  if(actual.loopCount){
   const finish=actual.loopCount===1?13502:14001+(actual.loopCount-2)*2168+1670;
   assert.equal(actual.tail[finish+493],0,`remaining substeps ${caseIndex}`);
  }
 }
});

test('retained second frame filters, animates and returns with original live state',async()=>{
 const {evaluateResetNextReturn}=await import('../scripts/mcm-reference/reset-next-return-case.mjs');
 const corpus=fixture('reset-next-return-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);
 assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.priorTraceChangedCases,0);
 assert.equal(corpus.source.priorTraceComparedCases,17941);
 for(const branch of ['crash','normal','trick','recovery'])assert.ok(corpus.source.returnCoverage[branch]);
 for(const {caseIndex,input,prefixBits,outputBits} of corpus.fixtures){
  const actual=evaluateResetNextReturn(input);
  assert.equal(actual.tail.length,46925);
  assert.equal(actual.returned,actual.loopCount>0);
  assert.deepEqual(actual.prefix,prefixBits,`second return prefix ${caseIndex}`);
  assert.deepEqual(actual.tail,outputBits,`second return tail ${caseIndex}`);
  assert.equal(actual.tail[46924],+actual.returned,`original ret 4 ${caseIndex}`);
 }
});

test('reusable retained frame runner preserves original substep finishes and actual return',async()=>{
 const {evaluateRetainedFrame}=await import('../scripts/mcm-reference/retained-frame-case.mjs');
 const corpus=fixture('retained-frame-wine11.json.br');
 assert.equal(corpus.source.mismatchCount,0);assert.equal(corpus.source.exceptionCount,0);
 assert.equal(corpus.source.cases,17941);assert.equal(corpus.source.substeps,24872);
 assert.deepEqual(corpus.source.statuses,{returned:10896,'original-nonterminating':52,'pending-controller':6543,'no-iterations':450});
 for(const {caseIndex,input,expected,status} of corpus.fixtures){
  const actual=evaluateRetainedFrame(input);
  assert.equal(actual.frame.status,status,`runner status ${caseIndex}`);
  assert.deepEqual(actual.prior.prefix,expected.prefix,`runner prefix ${caseIndex}`);
  assert.deepEqual(actual.prior.tail,expected.priorTail,`runner prior frame ${caseIndex}`);
  assert.deepEqual(actual.finishes,expected.finishes,`runner substeps ${caseIndex}`);
  assert.deepEqual(actual.output,expected.output,`runner return ${caseIndex}`);
 }
});
