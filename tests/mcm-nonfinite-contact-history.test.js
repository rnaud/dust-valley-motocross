import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {evaluateNormalEventDecisionSubstep} from '../scripts/mcm-reference/normal-event-decision-substep-case.mjs';

test('zero-step native contact outputs survive cold and finite-warmed execution',()=>{
 const {fixtures}=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/mcm/normal-event-decision-substep-wine11.json.gz',import.meta.url))));
 const check=index=>{
  const {input,outputBits}=fixtures[index];
  const actual=evaluateNormalEventDecisionSubstep(input);
  assert.deepEqual(actual,outputBits,`native case ${index}, fields ${actual.flatMap((v,i)=>v===outputBits[i]?[]:[i])}`);
 };
 for(const index of [6243,6257]){
  assert.equal(fixtures[index].input.dt,0);
  assert.ok(fixtures[index].outputBits.includes(0xffc00000));
  check(index);
 }
 // Warm ordinary finite paths, then switch back to the original zero-step
 // observations. Every output DWORD remains authoritative, including NaN sign.
 for(let pass=0;pass<4;pass++){
  for(let index=6000;index<6240;index++)check(index);
  for(const index of [6257,6243,6257,6243])check(index);
 }
});
