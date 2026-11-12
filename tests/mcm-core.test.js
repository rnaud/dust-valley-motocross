import test from 'node:test';
import assert from 'node:assert/strict';
import {bitsFloat, floatBits, mcmSqrt} from '../src/physics/mcm/math.js';
import {MCM_STEP, scheduleMcmFrame} from '../src/physics/mcm/scheduler.js';
import {readFileSync} from 'node:fs';

test('port matches captured original-instruction outputs under both reference FPU modes', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/mcm/helpers-wine11.json', import.meta.url)));
  for (const row of fixture.cases) {
    if (row.kind === 'sqrt') {
      assert.equal(floatBits(mcmSqrt(bitsFloat(row.inputBits))), row.outputBits);
    } else {
      const result = scheduleMcmFrame(bitsFloat(row.deltaBits), bitsFloat(row.carryBits));
      assert.equal(result.iterations, row.iterations);
      assert.equal(floatBits(result.dt), row.dtBits);
      assert.equal(floatBits(result.remainder), row.remainderBits);
      assert.equal(result.inverseDt, row.inverseDt);
    }
  }
});

test('lookup sqrt preserves powers of four and returns positive zero', () => {
  assert.equal(Object.is(mcmSqrt(-0), 0), true);
  for (let exponent = -126; exponent <= 126; exponent += 2) {
    assert.equal(mcmSqrt(2 ** exponent), 2 ** (exponent / 2));
  }
  assert.equal(floatBits(mcmSqrt(2)), 0x3fb50000);
  assert.equal(floatBits(mcmSqrt(3)), 0x3fdd0000);
  assert.notEqual(mcmSqrt(2), Math.fround(Math.sqrt(2)));
});

test('lookup bins ignore low 16 mantissa bits across all normal exponents', () => {
  for (let exponent = 1; exponent < 255; exponent++) {
    for (let bin = 0; bin < 128; bin++) {
      const start = (exponent << 23) | (bin << 16);
      const low = bitsFloat(start), high = bitsFloat(start | 0xffff);
      const result = mcmSqrt(low);
      assert.equal(result, mcmSqrt(high));
      assert.equal(floatBits(result) & 0xffff, 0);
      assert.ok(result <= Math.sqrt(low));
      assert.ok((Math.sqrt(high) - result) / Math.sqrt(high) < 0.012);
    }
  }
});

test('unsupported sqrt domains are explicit rather than silently using Math.sqrt', () => {
  for (const value of [-1, NaN, Infinity, -Infinity, bitsFloat(1)]) {
    assert.throws(() => mcmSqrt(value), RangeError);
  }
});

test('scheduler boundaries use binary32 nominal step, without an epsilon', () => {
  const below = bitsFloat(floatBits(MCM_STEP) - 1);
  const above = bitsFloat(floatBits(MCM_STEP) + 1);
  assert.equal(scheduleMcmFrame(below).dt, below);
  assert.equal(scheduleMcmFrame(MCM_STEP).remainder, 0);
  assert.equal(scheduleMcmFrame(above).dt, MCM_STEP);
  assert.equal(scheduleMcmFrame(above).remainder, above - MCM_STEP);
  assert.equal(scheduleMcmFrame(2 * MCM_STEP).iterations, 2);
});

test('short-frame fallback consumes carry, whereas zero delta uses nominal step', () => {
  const carry = scheduleMcmFrame(.03).remainder;
  const short = scheduleMcmFrame(.005, carry);
  assert.equal(short.dt, Math.fround(carry + Math.fround(.005)));
  assert.equal(short.iterations, 1);
  assert.equal(short.remainder, 0);
  for (const delta of [0, -0]) {
    assert.equal(scheduleMcmFrame(delta, carry).dt, MCM_STEP);
    assert.equal(scheduleMcmFrame(delta, carry).remainder, 0);
  }
});

test('long-frame cap discards whole steps and retains only fractional carry', () => {
  const stalled = scheduleMcmFrame(.25);
  assert.equal(stalled.iterations, 10);
  assert.equal(stalled.discardedSteps, 2);
  assert.equal(stalled.remainder, Math.fround(.25 - 12 * MCM_STEP));
  assert.equal(scheduleMcmFrame(.005, stalled.remainder).iterations, 1);
});

test('60 Hz frames each execute one short step rather than accumulating to 50 Hz', () => {
  let carry = 0, steps = 0;
  for (let i = 0; i < 60; i++) {
    const frame = scheduleMcmFrame(1 / 60, carry);
    carry = frame.remainder;
    steps += frame.iterations;
    assert.equal(frame.dt, Math.fround(1 / 60));
  }
  assert.equal(steps, 60);
  assert.equal(carry, 0);
});

test('separate sum representations preserve negative and full-step carry edge cases', () => {
  const frame = scheduleMcmFrame(0.09999999403953552, 2 ** -28);
  assert.equal(frame.iterations, 5);
  assert.equal(frame.remainder, -(2 ** -28));
  const next = scheduleMcmFrame(.01, frame.remainder);
  assert.equal(next.dt, Math.fround(Math.fround(.01) - 2 ** -28));
  assert.equal(next.remainder, 0);
  const roundedUp = scheduleMcmFrame(.03, bitsFloat(floatBits(MCM_STEP / 2) - 1));
  assert.equal(roundedUp.iterations, 1);
  assert.equal(roundedUp.remainder, MCM_STEP);
  assert.equal(scheduleMcmFrame(0, roundedUp.remainder).remainder, 0);
});

test('invalid scheduler inputs fail explicitly', () => {
  for (const delta of [-1, NaN, Infinity, 1e9]) assert.throws(() => scheduleMcmFrame(delta), RangeError);
  assert.throws(() => scheduleMcmFrame(.02, Infinity), RangeError);
  assert.throws(() => scheduleMcmFrame(.02, -1), RangeError);
});
