import test from 'node:test';
import assert from 'node:assert/strict';
import {GpuSandSurface} from '../src/sand-gpu-surface.js';
import {DEFAULT_SOIL} from '../src/sand-physics.js';

test('the GPU predictor sweeps a continuous trench between wheel contacts',()=>{
 const fine={n:512,step:0,enabled:true,center(){},push(){},read(){}};
 const surface=new GpuSandSurface(fine,()=>0,{soil:{...DEFAULT_SOIL,maxDepth:.34,maxLift:.22,settle:.1,dig:.2,repose:0,roost:0,conserve:true}});
 surface.recentre(0,0);
 for(let i=0;i<=24;i++)surface.deform([{x:0,z:i*.25,load:1200,demand:1},null],1/60);
 const line=[];for(let z=0;z<=5;z+=.05)line.push(surface.displacementAt(0,z));
 assert.ok(line.every(d=>d<-.01),`gaps in GPU sweep: ${Math.max(...line).toFixed(4)}`);
 assert.ok(surface.version>0);
 assert.equal(surface.displacementAt(0,20),0);
});
