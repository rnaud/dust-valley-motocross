import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {decodeChaseControlCase,chaseControlOutput} from './compare-chase-controls.mjs';
import {stepMcmChaseControls} from '../../src/physics/mcm/chase-controls.js';
export function analyzeLiveChaseControls(rows){
 assert.ok(rows.length&&rows.length%2===0,'Incomplete control capture');let changes=0,active=0;const keys=new Set(),joysticks=new Set(),modes=new Set();
 for(let i=0;i<rows.length;i+=2){const a=rows[i],b=rows[i+1];
  for(const r of [a,b]){assert.ok(Array.isArray(r.inputs)&&r.inputs.length===74&&r.inputs.every(w=>Number.isInteger(w)&&w>=0&&w<=0xffffffff),'Invalid control inputs');assert.ok(Number.isInteger(r.deltaBits)&&r.deltaBits>=0&&r.deltaBits<=0xffffffff,'Invalid delta');}
  const v=a.inputs;assert.equal(a.phase,'before');assert.equal(b.phase,'after');assert.equal(a.frame,i/2);assert.equal(b.frame,i/2);for(const k of ['camera','esp','ebp','deltaBits'])assert.equal(a[k],b[k],'Control boundary changed');
  assert.ok(!v[61]||!v[72],'Unrecovered free-camera controls');
  const input=Buffer.alloc(68),words=[v[11],v[62],v[28],v[24],v[23],v[26],v[63],a.deltaBits,...v.slice(64,72),1];words.forEach((w,j)=>input.writeUInt32LE(w,j*4));
  const c=decodeChaseControlCase(input),out=chaseControlOutput(c.state,stepMcmChaseControls(c.state,c.input));
  assert.deepEqual(Array.from({length:6},(_,j)=>out.readUInt32LE(j*4)),[b.inputs[24],b.inputs[23],b.inputs[26],b.inputs[28],b.inputs[31],b.inputs[41]],'Native control output differs');
  if(v[62])active++;if(v[24]!==b.inputs[24]||v[23]!==b.inputs[23]||v[26]!==b.inputs[26])changes++;keys.add(v[64]);joysticks.add(v[65]);modes.add(v[11]);
 }
 return {frames:rows.length/2,words:rows.length/2*6,active,changes,keys:[...keys].sort((a,b)=>a-b),joysticks:[...joysticks].sort(),modes:[...modes].sort()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeLiveChaseControls(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
