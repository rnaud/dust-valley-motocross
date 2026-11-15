import assert from 'node:assert/strict';
import {mcmIndexedDrawStack} from '../../src/physics/mcm/indexed-draw-stack.js';

// Root wrapper positions remain caller boundaries. Child wrappers follow the
// recovered 4206c0 traversal; application ESP is an output of the draw path.
export function deriveActorApplyStacks(render) {
  const stack=[];let applications=0,observedNonActorApplications=0,childWrappers=0,rootWrappers=0;
  const rows=render.map(r=>{
    if(r.phase==='wrapper'){
      let wrapper=r;
      if(stack.length){
        const parent=stack.at(-1);assert.equal(r.frame,parent.frame);
        const esp=(parent.esp-0xf8)>>>0;assert.equal(r.esp,esp,'Derived child wrapper stack differs');
        wrapper={...r,esp};childWrappers++;
      }else rootWrappers++;
      stack.push(wrapper);return wrapper;
    }
    if(r.phase==='wrapper-exit'){
      const wrapper=stack.pop();assert.ok(wrapper,'Unpaired wrapper exit');
      assert.equal(r.frame,wrapper.frame);assert.equal(r.actor,wrapper.actor);
      const esp=(wrapper.esp-0xe8)>>>0;assert.equal(r.esp,esp,'Wrapper exit stack differs');
      return {...r,esp};
    }
    if(r.phase!=='state-1bd500')return r;
    if(!r.actor){assert.equal(stack.length,0,'Application lost its active actor');observedNonActorApplications++;return r;}
    const wrapper=stack.at(-1);assert.ok(wrapper,'Missing actor wrapper stack');
    assert.equal(r.frame,wrapper.frame);assert.equal(r.actor,wrapper.actor);
    assert.equal(wrapper.hidden,0,'Hidden wrapper cannot use the indexed draw path');
    const computed=mcmIndexedDrawStack(wrapper.esp);
    assert.equal(r.esp,computed.stateApplyEntryEsp,'Derived actor application stack differs');
    applications++;return {...r,esp:computed.stateApplyEntryEsp};
  });
  assert.equal(stack.length,0,'Incomplete wrapper traversal');
  return {rows,applications,observedNonActorApplications,childWrappers,rootWrappers};
}
