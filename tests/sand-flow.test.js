import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOW,createFlowState,stepFlow,totalVolume,cellExchange} from '../src/sand-flow-model.js';

const dx=1,dt=1/60,deg=Math.PI/180;
const run=(state,seconds)=>{for(let t=0;t<seconds;t+=dt)stepFlow(state,dx,dt);};
const maxSlope=s=>{let m=0;const {n,h}=s;for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){const k=j*n+i;m=Math.max(m,Math.hypot(Math.max(0,h[k]-h[k+1],h[k]-h[k-1]),Math.max(0,h[k]-h[k+n],h[k]-h[k-n])));}return Math.atan(m)/deg;};

test('an over-steep sand ramp avalanches, settles near repose and conserves volume',()=>{
 // 45° ramp in x, sand all the way down to a deep bedrock.
 const s=createFlowState(48,{height:(i)=>Math.max(0,24-i)*1,rock:()=>-50}),v0=totalVolume(s,dx);
 run(s,40);
 const angle=maxSlope(s);
 assert.ok(angle<36&&angle>28,`settled at ${angle.toFixed(1)}°`);
 assert.ok(Math.abs(totalVolume(s,dx)-v0)/v0<1e-4,'volume conserved');
 assert.ok(s.r.every(v=>v<.01),'flow has come to rest');
});

test('hysteresis: still slopes between 31° and 34° stay put, 36° does not',()=>{
 const ramp=a=>createFlowState(32,{height:i=>(32-i)*Math.tan(a*deg),rock:()=>-50});
 const calm=ramp(32.5),h0=new Float32Array(calm.h);run(calm,5);
 assert.ok(calm.h.every((v,k)=>Math.abs(v-h0[k])<1e-6),'32.5° is metastable');
 const steep=ramp(36),h1=new Float32Array(steep.h);run(steep,5);
 assert.ok(steep.h.some((v,k)=>Math.abs(v-h1[k])>.01),'36° avalanches');
 // Once flowing, sand keeps moving until it is below the dynamic angle.
 const [,r]=cellExchange(1,.1,-1,1,Math.tan(33*deg),dt);assert.ok(r>.09,'a thick flowing layer at 33° keeps rolling');
 const [,thin]=cellExchange(1,.01,-1,1,Math.tan(32*deg),dt);assert.ok(thin<.01,'a layer thinner than h_stop settles');
});

test('bedrock does not flow and limits erosion',()=>{
 const s=createFlowState(32,{height:i=>(32-i)*1.5,rock:(i,j,h)=>h}),h0=new Float32Array(s.h);
 run(s,5);assert.ok(s.h.every((v,k)=>v===h0[k]),'bare rock cliff is static');
 const thin=createFlowState(32,{height:i=>(32-i)*1.5,rock:(i,j,h)=>h-.2});run(thin,10);
 assert.ok(thin.h.every((v,k)=>v>=thin.rock[k]-1e-6),'never eroded below bedrock');
});

test('flow speed follows Pouliquen: thicker layers on steeper slopes run faster',async()=>{
 const {cellFlux}=await import('../src/sand-flow-model.js'),o=[0,0,0,0];
 const out=(r,a)=>{const t=Math.tan(a*deg);cellFlux(t,r,0,2*t,t,t,1,dt,o);return o[0];};// steepest descent t to the east
 assert.equal(out(.05,30),0,'below the dynamic angle nothing moves');
 assert.ok(out(.05,40)>out(.05,33),'steeper flows faster');
 assert.ok(out(.08,36)/.08>out(.02,36)/.02,'thicker layers flow faster (Fr ∝ h/h_stop)');
 assert.ok(out(1,49)<=1*FLOW.maxOut+1e-9,'outflow is bounded');
});
