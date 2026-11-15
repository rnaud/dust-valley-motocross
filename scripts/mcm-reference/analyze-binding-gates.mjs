import assert from 'node:assert/strict';
import {mcmRenderBindingGates,mcmApplyBindingStack} from '../../src/physics/mcm/render-binding-gates.js';
import {mcmRenderBinding} from '../../src/physics/mcm/render-binding.js';

// Prepared dirty flags and shader configuration are explicit stage inputs.
// Producer/handler observations and stored words are comparison outputs only.
export function analyzeBindingGates(rows, moduleBase) {
  let application, command, applications=0, commands=0, stores=0, overlaps=0;
  const finishCommand=()=>{
    if(!command)return;
    assert.ok(command.handler,'Missing handler');assert.ok(command.returned,'Missing return boundary');
    assert.deepEqual(command.observed,command.expected);
    command=null;
  };
  const finishApply=()=>{
    finishCommand();if(!application)return;
    assert.ok(application.config && application.prepared,'Missing gate inputs');
    assert.equal(application.seen,application.predicted.length,'Command count');applications++;
  };
  for(const row of rows){
    if(row.phase==='state-1bd500'){
      finishApply();application={entry:row,seen:0};continue;
    }
    assert.ok(application,'Event outside application');
    assert.equal(row.frame,application.entry.frame,'Frame mismatch');
    if(row.phase==='state-prepared'){assert.ok(!application.prepared);application.prepared=row;}
    if(row.phase==='binding-gate-input'){
      assert.ok(!application.config);assert.equal(row.block,application.prepared.block);
      application.config=row;
      const model=mcmRenderBindingGates({...row,dirty108:application.prepared.dirty[2]});
      assert.equal(model.boundary,'continue','Unmodeled generated shader');
      application.predicted=model.commands;
    }
    if(row.phase==='binding-producer-input'){
      finishCommand();const expected=application.predicted[application.seen++];assert.ok(expected,'Unexpected producer');
      assert.deepEqual({slot:row.slot,value:row.value,callerRva:row.caller-moduleBase},expected);
      const stack=mcmApplyBindingStack(application.entry.esp);assert.equal(row.esp,stack.producerEntryEsp);
      // New value is zero, so optional zero-to-nonzero invalidation cannot occur.
      const model=mcmRenderBinding({...expected,previous:0,handlerEntryEsp:stack.handlerEntryEsp,moduleBase});
      command={producer:row,stack,expected:model.calls.filter(c=>c.store).map(c=>({...c.store,state:c.state})),observed:[]};commands++;
    }
    if(row.phase==='binding-input'){
      assert.ok(command&&!command.handler);assert.equal(row.opcode,20);
      assert.equal(row.cs,command.producer.cs);assert.equal(row.slot,command.producer.slot);assert.equal(row.value,command.producer.value);
      assert.equal(row.esp,command.stack.handlerEntryEsp);command.handler=row;
    }
    if(row.phase==='binding-call-store'){
      assert.ok(command?.handler);command.observed.push({address:row.address,value:row.value,state:row.state});stores++;
      overlaps+=Number(row.address===application.entry.scratch);
    }
    if(row.phase==='binding-call-return'){
      assert.ok(command?.handler&&!command.returned);command.returned=row;
      assert.deepEqual({address:row.address,value:row.value},command.expected.at(-1) && {address:command.expected.at(-1).address,value:command.expected.at(-1).value});
    }
  }
  finishApply();return {applications,commands,stores,overlaps};
}
