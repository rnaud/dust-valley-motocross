import test from 'node:test';
import assert from 'node:assert/strict';
import {SandFlowGPU} from '../src/sand-flow-gpu.js';
import {SandSurface} from '../src/sand-physics.js';

// CPU side of the GPU coupling (no renderer needed): rut injection bookkeeping and offsets.
const flow=()=>{const f=new SandFlowGPU(null,{size:64,extent:64});const n=64;f.base=new Float32Array(n*n);f.injected=new Float32Array(n*n);f.pending=new Float32Array(n*n);f.offsets=new Float32Array(n*n);f.shadow=new Map();f.pendingBox=null;return f;};

test('rider soil changes are injected once, volume-conserving, into the right cells',()=>{
 const f=flow(),sand=new SandSurface(()=>0);
 sand.onCells=(cells,s)=>f.observe(cells,s);
 for(let i=0;i<60;i++)sand.deform([{x:2.1,z:-3.3,load:1200,demand:1},null],1/120);
 let cpu=0;for(const t of sand.soil.values())for(const d of t.delta)cpu+=d*.0625;
 const pending=f.pending.reduce((a,b)=>a+b,0)*f.dx*f.dx;assert.ok(Math.abs(pending-cpu)<1e-6,`pending ${pending} vs cpu ${cpu}`);
 const k=f.cellOf(2.1,-3.3);assert.ok(f.pending[k]<0,'the rut lands in the cell under the tire');
 f.stageInjection();assert.equal(f.pending.reduce((a,b)=>a+Math.abs(b),0),0,'all staged');
 assert.ok(Math.abs(f.injected.reduce((a,b)=>a+b,0)*f.dx*f.dx-cpu)<1e-6,'injected total matches');
 assert.ok(f.rect.value.x>=0&&f.rect.value.z>f.rect.value.x,'staging rect set');
 f.stageInjection();assert.equal(f.rect.value.x,-1,'nothing staged twice');
});

test('flow offsets interpolate between cells and feed a sand base height',()=>{
 const f=flow(),k=f.cellOf(.5,.5);f.offsets[k]=.4;
 assert.ok(Math.abs(f.offsetAt(.5,.5)-.4)<1e-6);assert.ok(f.offsetAt(1,.5)>0&&f.offsetAt(1,.5)<.4);assert.equal(f.offsetAt(20,20),0);
 const sand=new SandSurface((x,z)=>f.offsetAt(x,z));assert.ok(Math.abs(sand.height(.5,.5)-.4)<.05,'collision surface follows the avalanche');
 assert.equal(sand.displacementAt(.5,.5),0,'flow is base, not rider displacement');
});
