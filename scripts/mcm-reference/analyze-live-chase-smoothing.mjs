import assert from 'node:assert/strict';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {stepMcmChaseSmoothing} from '../../src/physics/mcm/chase-smoothing.js';
const floats=words=>new Float32Array(Uint32Array.from(words).buffer);
const bits=values=>Array.from(new Uint32Array(values.buffer));
function fields(filters){const a=new Float32Array(24);filters.forEach((r,i)=>a.set(r,i*4));return bits(a);}
export function analyzeLiveChaseSmoothing(rows){
 let pending=null,filters=null,identity=null,pairs=0,shortUpdates=0,gradualChanges=0,minDelta=Infinity,maxDelta=-Infinity;
 for(const r of rows){
  for(const [name,n] of [['pointers',6],['filters',24],['targets',6],['result',6]])assert.ok(Array.isArray(r[name])&&r[name].length===n&&r[name].every(x=>Number.isInteger(x)&&x>=0&&x<=0xffffffff),'Invalid '+name);
  assert.ok(Number.isInteger(r.deltaBits)&&r.deltaBits>=0&&r.deltaBits<=0xffffffff,'Invalid delta');
  if(r.phase==='before'){
   assert.equal(pending,null,'Unpaired smoothing entry');assert.equal(r.frame,pairs,'Nonsequential smoothing frame');
   if(!filters){filters=Array.from({length:6},(_,i)=>floats(r.filters.slice(i*4,i*4+4)));identity={camera:r.camera,pointers:r.pointers};}
   assert.deepEqual({camera:r.camera,pointers:r.pointers},identity,'Smoothing identity changed');
   assert.deepEqual(r.filters,fields(filters),'Retained smoothing state differs at entry');
   const delta=floats([r.deltaBits])[0],targets=floats(r.targets);minDelta=Math.min(minDelta,delta);maxDelta=Math.max(maxDelta,delta);
   const previous=filters.map(record=>record[0]);
   for(const record of filters)if(delta>0&&delta<record[1])shortUpdates++;
   const result=stepMcmChaseSmoothing(filters,targets,delta),values=new Float32Array(6);values.set(result.target);values.set(result.eye,3);
   for(let i=0;i<6;i++)if(delta>0&&delta<filters[i][1]&&filters[i][0]!==previous[i]&&filters[i][0]!==targets[i])gradualChanges++;
   pending={row:r,expected:bits(values)};
  }else if(r.phase==='after'){
   assert.ok(pending,'Missing smoothing entry');
   for(const key of ['frame','camera','esp','ebp','deltaBits'])assert.equal(r[key],pending.row[key],'Smoothing boundary changed');
   assert.deepEqual(r.pointers,identity.pointers);assert.deepEqual(r.targets,pending.row.targets,'Target changed inside smoothing');
   assert.deepEqual(r.filters,fields(filters),'Native smoothing output differs');assert.deepEqual(r.result,pending.expected,'Native smoothing result differs');pairs++;pending=null;
  }else throw Error('Unknown smoothing phase');
 }
 assert.ok(filters&&!pending,'Incomplete smoothing capture');return {pairs,words:pairs*30,shortUpdates,gradualChanges,minDelta,maxDelta};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeLiveChaseSmoothing(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
