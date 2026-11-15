import assert from 'node:assert/strict';import {analyzeNodeDraw} from './analyze-node-draw.mjs';import {projectMcmBounds} from '../../src/physics/mcm/projected-bounds.js';
const floats=w=>new Float32Array(Uint32Array.from(w).buffer);
export function analyzeProjectedBounds(rows,terrain){
 let pending=null,latest=-1,bounds=0,accepted=0;const rewritten=[],wrappers=[];
 for(const r of rows){
  if(r.phase==='updated')latest=r.frame;
  if(r.phase==='wrapper-entry')wrappers.push(r);
  if(r.phase==='bounds-entry'){
   assert.equal(r.frame,latest+1);assert.equal(pending,null,'Nested bounds calculation');const wrapper=wrappers.at(-1);assert.ok(wrapper);assert.equal(r.rectAddress,wrapper.object+0x84);assert.equal(r.words.length,30);
   const v=floats(r.words);pending={entry:r,result:projectMcmBounds({matrix:v.slice(0,16),center:v.slice(16,19),extent:v.slice(19,22),viewport:r.words.slice(22,26),rect:r.words.slice(26,30).map(v=>v|0)})};
  }else if(r.phase==='bounds-exit'){
   assert.ok(pending&&!pending.exited,'Missing bounds entry');assert.equal(r.frame,pending.entry.frame);assert.equal(r.result,pending.result.accepted,'Computed bounds acceptance differs');const cornerFloats=new Float32Array(32);pending.result.corners.forEach((c,j)=>cornerFloats.set(c,j*4));assert.deepEqual(r.words,Array.from(new Uint32Array(cornerFloats.buffer)),'Computed bound corners differ');pending.exited=true;
  }else {
   if(r.phase==='wrapper-cull'){
    assert.ok(pending?.exited,'Missing completed bounds calculation');assert.equal(r.frame,pending.entry.frame);assert.deepEqual(r.fields.slice(0,4),pending.result.rect.map(v=>v>>>0),'Computed screen rectangle differs');assert.equal(r.result,pending.result.accepted);
    // The downstream node dispatch consumes the computed decision, not native output.
    rewritten.push({...r,result:pending.result.accepted});bounds++;accepted+=pending.result.accepted;pending=null;
   }else rewritten.push(r);
  }
  if(r.phase==='wrapper-exit'){assert.equal(wrappers.pop()?.object,r.object);}
 }
 assert.ok(!pending&&!wrappers.length,'Incomplete bounds capture');return {node:analyzeNodeDraw(rewritten,terrain),bounds,accepted,rejected:bounds-accepted,cornerWords:bounds*32,rectangleWords:bounds*4};
}
