import test from 'node:test';
import assert from 'node:assert/strict';
import {World,Vec3,RaycastResult} from 'cannon-es';
import {GpuSandSurface} from '../src/sand-gpu-surface.js';
import {OP} from '../src/sand-fine-gpu.js';
import {terrainMap} from '../src/terrain-maps.js';
import {createState,stepBike} from '../src/world.js';

// Stand-in for FineSandGPU: records ops, counts steps, serves readbacks.
const fakeFine=()=>({step:0,enabled:true,ops:[],push(kind,x,z,radius,p){this.ops.push({kind,x,z,radius,p,step:this.step});},center(){},read(){return Promise.resolve(null);}});
const soil=terrainMap('dunes').soil;
const volume=s=>{let v=0;for(const d of s.d)v+=d*.0625;return v;};

test('predicted ruts conserve sand and every op is queued for the GPU',()=>{
 const fine=fakeFine(),s=new GpuSandSurface(fine,()=>0,{soil}),world=new World();s.follow(0,0,world);
 for(let i=0;i<=80;i++)s.deform([{x:0,z:i*.05,load:1400,demand:.6,sinkage:.06},null],1/120);
 let moved=0;for(const d of s.d)moved+=Math.abs(d)*.0625;
 assert.ok(moved>.01,'ruts formed');assert.ok(Math.abs(volume(s))<moved*.03,`net ${volume(s)} of ${moved}`);
 assert.ok(fine.ops.some(o=>o.kind===OP.DIG)&&fine.ops.some(o=>o.kind===OP.RING)&&fine.ops.some(o=>o.kind===OP.DISC),'dig, berm and roost ops');
 assert.ok(s.displacementAt(0,2)<-.02,'trench under the path');
});

test('readbacks replace the local copy and replay ops the GPU had not applied yet',()=>{
 const fine=fakeFine(),s=new GpuSandSurface(fine,()=>0,{soil}),world=new World();s.follow(0,0,world);
 fine.step=5;for(let i=0;i<20;i++)s.deform([{x:0,z:i*.05,load:1400,demand:0,sinkage:.06},null],1/120);
 const predicted=s.displacementAt(0,.5);assert.ok(predicted<-.02);
 // GPU state from step 5 (before these ops): flat sand with a ripple bump.
 const w=96,data=new Float32Array(w*w*4);for(let k=0;k<w*w;k++)data[k*4]=.01;
 s.applyReadback({data,i0:s.i0,j0:s.j0,w,h:w,step:5});
 assert.ok(Math.abs(s.displacementAt(0,.5)-predicted-.01)<.03,'ruts survive the stale readback');
 assert.ok(Math.abs(s.displacementAt(8,8)-.01)<1e-6,'elsewhere the GPU truth wins');
 s.applyReadback({data,i0:s.i0,j0:s.j0,w,h:w,step:6});
 assert.equal(s.history.length,0,'ops older than the readback are dropped');
});

test('the collision tile matches height() and follows the bike',()=>{
 const fine=fakeFine(),coarse=(x,z)=>Math.sin(x*.1)+z*.02,s=new GpuSandSurface(fine,coarse,{soil}),world=new World();s.follow(10,-6,world);
 for(let i=0;i<30;i++)s.deform([{x:10,z:-6+i*.04,load:1500,demand:1,sinkage:.08},null],1/120);
 const ray=new RaycastResult();
 for(const [x,z] of [[10,-5.5],[11.3,-6.2],[8.1,-4]]){world.raycastClosest(new Vec3(x,20,z),new Vec3(x,-20,z),{},ray);assert.ok(ray.hasHit);assert.ok(Math.abs(ray.hitPointWorld.y-s.height(x,z))<1e-6);}
 const first=s.tile.body;s.follow(30,-6,world);assert.notEqual(s.tile.body,first);assert.equal(world.bodies.length,1);
 assert.equal(s.tile.body.sandSurface,s);
});

test('a bike rides GPU-backed sand through the normal physics',()=>{
 const fine=fakeFine(),s=new GpuSandSurface(fine,()=>0,{soil}),st=createState({physicsMode:'classic',flat:true,height:()=>0,soil,heroRocks:false,sandSurface:s});
 for(let i=0;i<360;i++)stepBike(st,{gas:i>30},1/120);
 assert.equal(st.physics.sand,s);assert.ok(st.speed>2,`speed ${st.speed}`);assert.equal(st.crashed,false);assert.ok(fine.ops.length>50);
 assert.ok(st.sandContact.some(c=>c&&c.sinkage>0));
});
