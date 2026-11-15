import assert from 'node:assert/strict';
import {analyzeRenderGates} from './analyze-render-gates.mjs';
import {setMcmRenderMatrixDirty,mcmRenderProductAddress} from '../../src/physics/mcm/render-dirty.js';
export function analyzeRenderDirty(rows,terrain){
 const render=analyzeRenderGates(rows.filter(r=>r.stateblock===undefined),terrain);
 const states=new Map();let setter=null,apply=null,setters=0,applies=0,products=0,skipped=0,overlaps=0,seeded=0;
 for(const r of rows){
  if(r.stateblock===undefined)continue;
  if(!states.has(r.stateblock)){states.set(r.stateblock,!!(r.flags&2));seeded++;}
  let expected=states.get(r.stateblock);
  if(r.phase==='dirty-set-exit'){
   assert.ok(setter,'Missing setter entry');assert.equal(r.stateblock,setter.stateblock);assert.equal(r.type,setter.type);expected=setMcmRenderMatrixDirty(expected,r.type);states.set(r.stateblock,expected);setter=null;setters++;
  }else if(r.phase==='apply-cleared'){
   assert.ok(apply&&apply.gate&&!apply.cleared,'Missing apply gate or duplicate clear');assert.equal(r.stateblock,apply.stateblock);assert.equal(apply.products,apply.dirty?1:0,'Dirty flag did not predict product count');expected=false;states.set(r.stateblock,false);apply.cleared=true;
  }
  assert.equal(!!(r.flags&2),expected,'Retained matrix dirty flag differs');
  if(r.phase==='dirty-set-entry'){assert.equal(setter,null,'Nested setter');setter=r;}
  else if(r.phase==='apply-entry'){assert.equal(apply,null,'Nested apply');assert.equal(r.blend,0,'Unrecovered blend matrices');apply={...r,gate:false,products:0,cleared:false};}
  else if(r.phase==='apply-gate'){assert.ok(apply&&!apply.gate,'Missing or duplicate apply entry');assert.equal(r.stateblock,apply.stateblock);apply.gate=true;apply.dirty=expected;}
  else if(r.phase==='apply-product'){
   assert.ok(apply&&apply.gate&&apply.dirty&&!apply.cleared,'Unexpected matrix product');assert.equal(r.stateblock,apply.stateblock);assert.equal(r.destination,mcmRenderProductAddress(apply.esp),'Derived product address differs');apply.products++;products++;if(r.scratchAddress&&r.destination+8===r.scratchAddress)overlaps++;
  }else if(r.phase==='apply-exit'){assert.ok(apply&&apply.cleared,'Apply exited before clear');assert.equal(r.stateblock,apply.stateblock);applies++;if(!apply.dirty)skipped++;apply=null;}
 }
 assert.ok(!apply&&!setter,'Incomplete dirty capture');assert.equal(overlaps,render.submission.stores,'Predicted overlaps differ from exact stores');assert.ok(applies&&products&&skipped,'Missing gate coverage');return {render,seeded,setters,applies,products,skipped,overlaps};
}
