import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {mcmIndexedDrawStack} from '../src/physics/mcm/indexed-draw-stack.js';
import {deriveActorApplyStacks} from '../scripts/mcm-reference/derive-actor-apply-stacks.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}.json.br`,import.meta.url))));
test('original indexed-draw frames derive native application ESP and both Wine frame pointers',()=>{
 const f=read('indexed-draw-stack-wine11');assert.equal(f.cases.length,6);const actors=new Set();
 for(const {wrapper:w,observed:o} of f.cases){
  assert.equal(w.frame,o.frame);assert.equal(w.actor,o.actor);assert.equal(w.hidden,0);actors.add(w.actor);
  const s=mcmIndexedDrawStack(w.esp);
  assert.equal(s.stateApplyEntryEsp,o.esp);assert.equal(s.helperFrameBase,o.ebp);
  assert.equal(o.words[0],f.ddrawBase+0xebf6);
  assert.deepEqual(o.chain[0],[s.helperFrameBase,s.methodFrameBase,f.ddrawBase+0xf566]);
  assert.equal(o.chain[1][0],s.methodFrameBase);assert.equal(o.chain[1][2],0x445f88);
  // chain[1][1] is the original routine's saved vertex pointer, not an EBP frame.
 }
 assert.equal(actors.size,2);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);
 assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,174);assert.match(f.provenance.run,/captured=10 status=1/);
});
test('combined history derives all actor application stacks and rejects either changed boundary',()=>{
 const f=read('world-writers-wine11'),before=JSON.stringify(f.render),r=deriveActorApplyStacks(f.render);
 assert.equal(r.applications,52);assert.equal(r.childWrappers,82);assert.equal(r.rootWrappers,82);assert.equal(r.observedNonActorApplications,8334);assert.equal(JSON.stringify(f.render),before);
 const application=f.render.find(x=>x.phase==='state-1bd500'&&x.actor);
 const wrapper=f.render.find(x=>x.phase==='wrapper'&&x.frame===application.frame&&x.actor===application.actor);
 application.esp+=4;assert.throws(()=>deriveActorApplyStacks(f.render),/Derived actor application stack differs/);application.esp-=4;
 wrapper.esp+=4;assert.throws(()=>deriveActorApplyStacks(f.render),/Derived actor application stack differs/);wrapper.esp-=4;
 const child=f.render.find(x=>x.phase==='wrapper'&&x.actor!==wrapper.actor);child.esp+=4;assert.throws(()=>deriveActorApplyStacks(f.render),/Derived child wrapper stack differs/);child.esp-=4;
 wrapper.hidden=1;assert.throws(()=>deriveActorApplyStacks(f.render),/Hidden wrapper/);
});
