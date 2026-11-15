import assert from 'node:assert/strict';
import {predictMcmSceneActors} from '../../src/physics/mcm/scene-actor-draws.js';
import {mcmIndexedDrawStack} from '../../src/physics/mcm/indexed-draw-stack.js';
export const sceneActorPhases=new Set(['scene-root-input','scene-node-input','scene-draw-return','child-before','child-after','child-target','wrapper','state-1bd500']);
// One scene initialization; later snapshots are comparisons, never reseeds.
export function analyzeSceneActorDraws(rows,ownerDrawTarget) {
  const frames=new Map();let warmupWrappers=0;
  for(const r of rows){
    assert.ok(sceneActorPhases.has(r.phase));
    if(r.phase==='scene-root-input'){assert.ok(!frames.has(r.frame));frames.set(r.frame,{input:r,nodes:new Map(),wrappers:[],calls:[],stack:[],applications:[]});continue;}
    const f=frames.get(r.frame);if(!f){if(r.phase==='wrapper')warmupWrappers++;continue;}
    if(r.phase==='scene-node-input'){assert.ok(!f.nodes.has(r.address));const {phase,frame,...node}=r;f.nodes.set(r.address,node);continue;}
    if(f.complete)continue;
    if(r.phase==='child-before'||r.phase==='child-after'){assert.ok(!f.boundary);f.boundary=r;}
    if(r.phase==='child-target'){
      assert.ok(f.boundary);assert.equal(f.boundary.phase,r.after?'child-after':'child-before');
      if(!r.after){const call={address:r.child,target:r.target,esp:(f.boundary.esp-4)>>>0};f.calls.push(call);f.stack.push(call);}
      else{const call=f.stack.pop();assert.ok(call);assert.equal(call.address,r.child);assert.equal(call.target,r.target);call.result=f.boundary.result;}
      f.boundary=null;
    }
    if(r.phase==='wrapper')f.wrappers.push({actor:r.actor,esp:r.esp});
    if(r.phase==='state-1bd500'&&r.actor)f.applications.push(r);
    if(r.phase==='scene-draw-return'){assert.equal(f.stack.length,0);assert.ok(!f.boundary);f.complete=r;}
  }
  const reports=[];let initial=null,root=null,comparedNodes=0,derivedApplications=0,callbacksChecked=0;
  for(const [frame,f] of frames){
    if(!initial){initial=new Map([...f.nodes].map(([a,n])=>[a,{...n}]));root=f.input.root;}
    else{assert.deepEqual(f.nodes,initial,'Retained scene hierarchy differs');comparedNodes+=f.nodes.size;}
    assert.equal(f.input.root,root);assert.equal(f.input.target,initial.get(root).target);
    if(!f.complete){assert.equal(frame,[...frames.keys()].at(-1),'Incomplete interior scene interval');continue;}
    const used=new Set();
    const predicted=predictMcmSceneActors({root,nodes:initial,worldEntryEsp:f.input.esp,ownerDrawTarget,
      opaqueDraw:node=>{
        const calls=f.calls.filter(c=>c.address===node.address&&c.target===node.target);assert.equal(calls.length,1,'Ambiguous opaque callback boundary');
        assert.ok(!used.has(calls[0]));used.add(calls[0]);return calls[0].result;
      }});
    const calls=predicted.calls.slice(1),addresses=new Set(calls.map(c=>c.address));
    assert.deepEqual(calls,f.calls.filter(c=>addresses.has(c.address)),'Predicted traversal calls differ');callbacksChecked+=calls.length;
    assert.deepEqual(predicted.wrappers,f.wrappers,'Predicted wrapper order or stack differs');assert.equal(predicted.result,f.complete.result);
    const byActor=new Map(predicted.wrappers.map(w=>[w.actor,w]));
    for(const application of f.applications){const wrapper=byActor.get(application.actor);assert.ok(wrapper);assert.equal(application.esp,mcmIndexedDrawStack(wrapper.esp).stateApplyEntryEsp,'Scene-derived application stack differs');derivedApplications++;}
    reports.push({frame,wrappers:predicted.wrappers,opaque:predicted.opaque});
  }
  return {scope:'Retained hierarchy and computed actor traversal; other callback results, world entry stack, and draw visibility remain boundary inputs. No full scene execution claim.',
    seededNodes:initial?.size??0,comparedNodes,warmupWrappers,completeFrames:reports.length,pendingFrames:frames.size-reports.length,derivedApplications,callbacksChecked,reports};
}
