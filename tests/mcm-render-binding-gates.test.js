import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {mcmRenderBindingGates} from '../src/physics/mcm/render-binding-gates.js';
import {analyzeBindingGates} from '../scripts/mcm-reference/analyze-binding-gates.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}.json.br`,import.meta.url))));
test('native binding gates match all shader/dirty/adapter combinations and command order',()=>{
 const f=read('render-binding-gates-wine11'),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),coverage=new Set(),branches=new Set();
 assert.equal(input.length,4096*24);assert.equal(output.length,4096*32);
 for(let i=0;i<4096;i++){
  const [dirty108,adapterFlags,pixelShader,vertexShader,declaration,transformed]=Array.from({length:6},(_,j)=>input.readUInt32LE(i*24+j*4));
  coverage.add([dirty108&24,!!(adapterFlags&64),!!pixelShader,!!vertexShader,!!declaration,!!transformed].join('/'));
  const r=mcmRenderBindingGates({dirty108,adapterFlags,pixelShader,vertexShader,declaration,transformed});branches.add(r.boundary);
  const words=[['continue','generated-pixel','generated-vertex'].indexOf(r.boundary),r.commands.length,...r.commands.flatMap(c=>[c.slot,c.value,c.callerRva])];while(words.length<8)words.push(0);
  assert.deepEqual(words,Array.from({length:8},(_,j)=>output.readUInt32LE(i*32+j*4)),`case ${i}`);
 }
 assert.equal(coverage.size,128);assert.equal(branches.size,3);
});
test('live gate inputs predict commands and application-relative CALL writes',()=>{
 const f=read('render-binding-gates-live-wine11');
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,174);
 assert.deepEqual(analyzeBindingGates(f.rows,f.moduleBase),{applications:871,commands:36,stores:36,overlaps:4});
});
test('gate integration rejects altered command, handler and store observations',()=>{
 const f=read('render-binding-gates-live-wine11');
 for(const [phase,key] of [['binding-producer-input','slot'],['binding-input','esp'],['binding-call-store','address'],['binding-call-return','value']]){
  const rows=structuredClone(f.rows);rows.find(r=>r.phase===phase)[key]^=1;assert.throws(()=>analyzeBindingGates(rows,f.moduleBase));
 }
});
