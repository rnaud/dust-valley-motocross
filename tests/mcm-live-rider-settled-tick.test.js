import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRiderTick} from '../scripts/mcm-reference/compare-live-rider-tick.mjs';
import {loadLiveRiderTick} from '../scripts/mcm-reference/live-rider-tick.mjs';
import {advanceMcmRiderTick} from '../src/physics/mcm/rider-tick.js';
import {floatBits} from '../src/physics/mcm/math.js';
function fixture(){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-rider-settled-tick-wine11.json.br',import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,terrain:{...f.terrain,root:node(f.terrain.root)}};
}
test('settled rider animation seeks and subsequent ground motion match original ticks',()=>{
 const f=fixture(),reports=f.cases.map(c=>compareLiveRiderTick(c.before,c.after,f.terrain));
 assert.deepEqual(reports.map(r=>r.frame),[218,219]);assert.equal(reports.reduce((n,r)=>n+r.comparedWords,0),566772);assert.equal(reports.reduce((n,r)=>n+r.changedWords,0),638);
 for(const r of reports)assert.deepEqual(r.differences,[]);
 const loaded=loadLiveRiderTick({...f.cases[0].before,terrain:f.terrain});assert.equal(loaded.context.animation.stopped,1);
 advanceMcmRiderTick(loaded.context,loaded.dt);assert.equal(loaded.context.animation.stopped,1);assert.equal(loaded.context.animation.record.token,loaded.context.rider.selected[2]);
});
