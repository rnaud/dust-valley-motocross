import test from 'node:test';
import assert from 'node:assert/strict';
import {World,Vec3,RaycastResult} from 'cannon-es';
import {SandSurface} from '../src/sand-physics.js';
import {createState,stepBike,resetBike} from '../src/world.js';

const press=(sand,x,z,frames=60,demand=0)=>{for(let i=0;i<frames;i++)sand.deform([{x,z,load:1000,demand},null],1/120);};
test('sand settles finitely, compacts, and responds to load and drive demand',()=>{
 const sand=new SandSurface(()=>0);press(sand,.125,.125,600);const settled=sand.height(.125,.125);
 press(sand,.125,.125,600);assert.ok(Math.abs(sand.height(.125,.125)-settled)<.00001);
 assert.ok(settled<-.015&&settled>-.05);assert.ok(sand.compaction(0,0)>0);
 press(sand,.125,.125,120,1);assert.ok(sand.height(.125,.125)<settled-.02);
 const airborne=new SandSurface(()=>0);airborne.deform([null,null],1);assert.equal(airborne.soil.size,0);
 const unloaded=new SandSurface(()=>0);unloaded.deform([{x:0,z:0,load:0},null],1);assert.equal(unloaded.height(0,0),0);
});
test('sand sweep is repeatable, continuous and does not bridge teleports',()=>{
 const run=()=>{const s=new SandSurface(()=>0);press(s,0,0,1,1);press(s,0,3,1,1);return s;};
 const a=run(),b=run();for(let z=0;z<=3;z+=.25){assert.ok(a.height(0,z)<0);assert.equal(a.height(0,z),b.height(0,z));}
 press(a,0,30,1,1);assert.equal(a.height(0,15),0);
});
test('sand tiles share exact collision heights across seams and retain revisited ruts',()=>{
 const s=new SandSurface((x,z)=>Math.sin(x)*.1+Math.cos(z)*.1),world=new World();s.follow(0,0,world);press(s,16,0,100,1);
 assert.equal(s.tiles.size,9);assert.equal(world.bodies.length,9);
 const ray=new RaycastResult();
 for(const x of [15.875,15.999,16.001,16.125])for(const z of [-.125,.125]){
  world.raycastClosest(new Vec3(x,2,z),new Vec3(x,-2,z),{},ray);
  assert.ok(ray.hasHit);assert.ok(Math.abs(ray.hitPointWorld.y-s.height(x,z))<1e-9);
 }
 const before=s.height(16,0);s.follow(100,100,world);s.follow(0,0,world);assert.equal(s.height(16,0),before);assert.equal(world.bodies.length,9);
 const left=s.tiles.get('0,0'),right=s.tiles.get('1,0');for(let j=0;j<=64;j++)assert.equal(left.data[64][j],right.data[0][j]);
});
test('soil storage and active collision bodies are bounded',()=>{
 const s=new SandSurface(()=>0,{maxStoredTiles:16}),world=new World();
 for(let i=0;i<24;i++){s.follow(i*32,0,world);press(s,i*32,0,1);}
 assert.ok(s.soil.size<=16);assert.equal(s.tiles.size,9);assert.equal(world.bodies.length,9);
});
test('default sand rides and recovers onto the same surface',()=>{
 const s=createState({flat:true,height:()=>0});
 for(let i=0;i<240;i++)stepBike(s,{gas:i>60},1/120);
 assert.ok(s.speed>3);assert.equal(s.crashed,false);assert.ok(s.physics.sand.soil.size>0);assert.ok(Number.isFinite(s.y));
 const height=s.physics.height(s.x,s.z);resetBike(s,s.x,s.z,0);assert.equal(s.physics.chassis.position.y,height+1.2);assert.deepEqual(s.physics.sand.previous,[null,null]);
});

test('MCM preview uses deformable soil by default and preserves explicit parity baseline',()=>{
 const options={flat:true,height:()=>0,physicsMode:'mcm-preview'};
 const soft=createState(options),baseline=createState({...options,sand:false});
 assert.ok(soft.physics.sand);assert.equal(baseline.physics.sand,null);
 for(let i=0;i<300;i++)for(const s of [soft,baseline])stepBike(s,{gas:true},.02);
 assert.ok(soft.physics.sand.soil.size>0);assert.ok(soft.speed>10);assert.equal(soft.crashed,false);
 assert.ok(soft.z<baseline.z,'soil resistance must affect recovered-engine riding');
 assert.ok(soft.engine.recovered);assert.ok(baseline.engine.recovered);
 for(let i=0;i<60;i++)stepBike(soft,{},.02);
 assert.equal(soft.throttle,0);assert.equal(soft.engine.force,0);
});
test('race spawn and both handling modes retain ground support with tiled sand',()=>{
 for(const physicsMode of ['classic','mcm-preview']){
  const s=createState({physicsMode});assert.ok(s.physics.sand);
  for(let i=0;i<120;i++)stepBike(s,{},1/120);
  assert.equal(s.contacts,2);assert.equal(s.crashed,false);
  for(let i=0;i<180;i++)stepBike(s,{gas:true},1/120);
  assert.ok(s.speed>1);assert.ok(Number.isFinite(s.y));assert.equal(s.physics.sand.tiles.size,9);
 }
});

test('a moving driven wheel leaves a readable rut at classic and preview step rates',()=>{
 const depths=[];
 for(const dt of [1/120,.02]){
  const s=new SandSurface(()=>0);
  for(let t=0;t<1;t+=dt)s.deform([{x:.125,z:t*20,load:1000,demand:1},null],dt);
  const depth=-s.displacementAt(.125,10);depths.push(depth);
  assert.ok(depth>.03&&depth<.14,`moving-wheel rut ${depth}`);
  assert.equal(s.displacementAt(2,10),0);
 }
 assert.ok(Math.abs(depths[0]-depths[1])<.005,'rut depth should remain comparable across supported simulation steps');
});
