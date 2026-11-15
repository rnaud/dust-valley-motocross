import assert from 'node:assert/strict';
import {mcmRenderUpdateCommand,mcmRenderCommandFree} from '../../src/physics/mcm/render-command.js';
export function analyzeRenderCommands(cases){
 let frees=0,skips=0;assert.ok(cases.length);
 for(const c of cases){
  const computed=mcmRenderUpdateCommand(c.producer);
  assert.equal(c.producer.frame,c.bytes.frame);
  assert.deepEqual([...computed],c.bytes.words,'Serialized command differs');
  for(const r of [c.input,c.prepared]){
   assert.equal(r.frame,c.producer.frame);assert.equal(r.command,c.bytes.command);
   assert.deepEqual([r.buffer,r.pointer,r.flags],[...computed.slice(9,12)],'Cleanup inputs changed');
  }
  const free=mcmRenderCommandFree(computed);
  assert.equal(c.free.length,free?1:0,'Cleanup gate differs');
  if(free){assert.equal(c.free[0].frame,c.producer.frame);frees++;}else skips++;
 }
 return {commands:cases.length,words:cases.length*14,frees,skips};
}
