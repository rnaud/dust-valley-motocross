import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {prepareMcmChaseTargets} from '../../src/physics/mcm/chase-preparation.js';
import {analyzeLiveChaseSmoothing} from './analyze-live-chase-smoothing.mjs';

export function analyzeLiveChasePreparation(rows){
 const prepared=structuredClone(rows),modes=new Set(),actorTypes=new Set();
 for(const r of prepared){
  assert.ok(Array.isArray(r.inputs)&&r.inputs.length===13&&r.inputs.every(x=>Number.isInteger(x)&&x>=0&&x<=0xffffffff),'Invalid preparation inputs');
  if(r.phase!=='before')continue;
  const values=new Float32Array(Uint32Array.from(r.inputs).buffer);
  const args={base:values.slice(0,3),offset:values.slice(3,6),eye:values.slice(6,9),factor:values[9],distance:values[10],mode:r.inputs[11],actorType:r.inputs[12]};
  // This live capture starts with existing records. The downstream analyzer
  // seeds them once, then verifies every subsequent entry against retained state.
  assert.ok(r.pointers.every(p=>p!==0),'Live initialization is not captured');
  const targets=prepareMcmChaseTargets({filters:[]},args);
  r.targets=Array.from(new Uint32Array(targets.buffer));modes.add(args.mode);actorTypes.add(args.actorType);
 }
 const result=analyzeLiveChaseSmoothing(prepared);
 return {...result,words:result.words+result.pairs*6,modes:[...modes].sort(),actorTypes:[...actorTypes].sort()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeLiveChasePreparation(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
