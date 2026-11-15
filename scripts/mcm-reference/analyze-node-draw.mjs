import assert from 'node:assert/strict';import {analyzeRenderDirty} from './analyze-render-dirty.mjs';import {analyzeLiveChaseController} from './analyze-live-chase-controller.mjs';import {dispatchMcmNodeDraw} from '../../src/physics/mcm/node-draw.js';
const extra=r=>r.phase.startsWith('node-')||r.phase.startsWith('wrapper-');
export function analyzeNodeDraw(rows,terrain){
 const render=analyzeRenderDirty(rows.filter(r=>!extra(r)),terrain),computed=new Map();
 analyzeLiveChaseController(rows.filter(r=>r.inputs),{terrain,matrices:true,onMatrices:r=>computed.set(r.frame,r)});
 const stack=[];let latest=-1,node=null,wrappers=0,rejected=0,nodes=0,visibilityChecks=0,childDepthChecks=0,riderStores=0,warmupStores=0;
 for(const r of rows){
  if(r.phase==='updated')latest=r.frame;
  if(extra(r))assert.equal(r.frame,latest+1,'Node event reordered relative to camera');
  if(r.phase==='wrapper-entry'){
   assert.equal(r.caller,0x4206f9,'Unrecovered wrapper caller');if(stack.length){assert.equal(r.esp,stack.at(-1).entry.esp-0xf8,'Recursive wrapper depth differs');childDepthChecks++;}stack.push({entry:r,cull:null,nodes:0});
  }else if(r.phase==='wrapper-cull'){
   const w=stack.at(-1);assert.ok(w&&w.cull===null);assert.equal(r.object,w.entry.object);assert.equal(r.esp,w.entry.esp-0xe8);w.cull=!!r.result;
  }else if(r.phase==='node-entry'){
   const w=stack.at(-1);assert.ok(w&&w.cull,'Node called after rejected bounds');assert.equal(node,null);assert.equal(r.object,w.entry.node);assert.equal(r.caller,0x44ff64);assert.equal(r.esp,w.entry.esp-0xec,'Wrapper to node stack differs');
   const state={hidden:r.fields[1],pending:r.fields[2],renderable:r.fields[3],prepared:r.fields[4]},calls=[];dispatchMcmNodeDraw(state,{prepare:()=>calls.push('prepare'),draw:()=>calls.push('draw'),fallback:()=>calls.push('fallback')});assert.ok(!calls.includes('prepare')&&!calls.includes('fallback'),'Uncaptured node callee path');
   const camera=computed.get(r.frame-1);if(camera){const index=r.object===r.bikeNode?0:r.object===r.riderNode?1:-1;assert.ok(index>=0,'Unrecovered node identity');assert.equal(state.hidden,camera.nodes[index].flag12c,'Computed camera visibility differs');visibilityChecks++;}
   node={entry:r,state,calls,draws:0};w.nodes++;
  }else if(r.phase==='world-entry'&&node){assert.equal(r.object,node.entry.object);assert.equal(r.esp,node.entry.esp-8,'Node to world stack differs');node.draws++;}
  else if(r.phase==='scratch-store'){
   assert.ok(node,'Scratch store outside node draw');if(node.entry.riderNode){assert.equal(node.entry.object,node.entry.riderNode,'Scratch writer is not player rider');riderStores++;}else warmupStores++;
  }else if(r.phase==='node-exit'||r.phase==='node-hidden-exit'){
   assert.ok(node);assert.equal(r.object,node.entry.object);assert.equal(r.esp,node.entry.esp-4);assert.equal(node.draws,node.calls.filter(c=>c==='draw').length,'Dispatch draw count differs');assert.equal(r.fields[2],node.state.pending);assert.equal(r.phase,node.state.hidden?'node-hidden-exit':'node-exit');node=null;nodes++;
  }else if(r.phase==='wrapper-exit'){
   const w=stack.pop();assert.ok(w&&w.cull!==null);assert.equal(r.object,w.entry.object);assert.equal(w.nodes,w.cull?1:0,'Bounds result did not control node dispatch');assert.equal(r.esp,w.entry.esp-0xe8);wrappers++;if(!w.cull)rejected++;
  }
 }
 assert.ok(!stack.length&&!node,'Incomplete node capture');assert.equal(riderStores,render.overlaps);return {render,wrappers,rejected,nodes,visibilityChecks,childDepthChecks,riderStores,warmupStores};
}
