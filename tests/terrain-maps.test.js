import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainMaps,terrainMap,paintTerrainMap,fbm} from '../src/terrain-maps.js';
import {createState,stepBike} from '../src/world.js';

const slopeAt=(h,x,z,e=1)=>Math.hypot(h(x+e,z)-h(x-e,z),h(x,z+e)-h(x,z-e))/(2*e);

test('terrain maps are deterministic, finite and bounded across the world',()=>{
 assert.deepEqual(terrainMaps.map(m=>m.id),['dunes','quarry','canyon','baja']);
 for(const map of terrainMaps){
  let lo=Infinity,hi=-Infinity;
  for(let x=-450;x<=450;x+=7.5)for(let z=-450;z<=450;z+=7.5){const h=map.height(x,z);assert.ok(Number.isFinite(h),map.id);lo=Math.min(lo,h);hi=Math.max(hi,h);}
  assert.ok(hi-lo>8&&hi-lo<80,`${map.id} relief ${hi-lo}`);
  assert.equal(map.height(123.4,-56.7),map.height(123.4,-56.7));
  assert.equal(terrainMap(map.id),map);
 }
 assert.equal(terrainMap('nope'),null);
 const n=[];for(let i=0;i<400;i++)n.push(fbm(i*.37,i*.11,3,1));
 assert.ok(Math.min(...n)>=0&&Math.max(...n)<=1);
});

test('every map spawns on gentle ground inside the recovery radius',()=>{
 for(const {id,height,spawn} of terrainMaps){
  assert.ok(Math.hypot(spawn.x,spawn.z)<380,id);
  for(const [dx,dz] of [[0,0],[0,6],[0,-6],[6,0],[-6,0]])assert.ok(slopeAt(height,spawn.x+dx,spawn.z+dz)<.2,`${id} spawn slope`);
  assert.ok(Number.isFinite(spawn.yaw));
 }
});

test('signature features: dune slip faces, quarry benches, gorge walls, baja whoops',()=>{
 const dunes=terrainMap('dunes').height;let steep=0,gentle=0;
 for(let x=-400;x<=400;x+=3)for(const z of [-200,0,120,300]){const s=slopeAt(dunes,x,z);if(s>.5)steep++;else if(s<.35)gentle++;}
 let peak=0;for(let x=-400;x<=400;x+=2)for(const z of [-200,0,120,300])peak=Math.max(peak,slopeAt(dunes,x,z));
 assert.ok(Math.atan(peak)*180/Math.PI<35.5,'authored slip faces stay at the angle of repose');
 assert.ok(steep>10&&gentle>steep*2,'dunes have short steep faces and long windward ramps');
 const quarry=terrainMap('quarry').height;
 assert.ok(quarry(0,200)<-28,'pit floor is deep');assert.ok(Math.abs(quarry(0,0))<6,'start is on the rim plateau');
 const levels=new Set();for(let z=60;z<=200;z+=2)levels.add(Math.round(quarry(60,z)/2));assert.ok(levels.size>=5,'benches step down');
 const canyon=terrainMap('canyon'),c=canyon.spawn.x;
 assert.ok(canyon.height(c+70,0)-canyon.height(c,0)>20,'gorge is cut deep into the plateau');
 const baja=terrainMap('baja').height,along=a=>{const r=255+45*Math.sin(3*a+.4)+20*Math.sin(5*a);return baja(r*Math.cos(a),r*Math.sin(a));};
 const peaks=(from,to)=>{let n=0;for(let a=from+.003;a<to;a+=.0015)if(along(a)>along(a-.0015)&&along(a)>along(a+.0015))n++;return n;};
 assert.ok(peaks(.85,1.15)>8,'whoop section carries repeated bumps');assert.ok(peaks(-.15,.15)<4,'start straight is smooth');
});

test('scenery clearance and paint stay in range',()=>{
 for(const map of terrainMaps){
  assert.equal(typeof map.clear(0,0),'boolean');
  const rgba=paintTerrainMap(map,32);assert.equal(rgba.length,32*32*4);
  let sum=0;for(let i=0;i<rgba.length;i+=4){sum+=rgba[i];assert.ok(rgba[i+3]>=0&&rgba[i+3]<=255);}
  assert.ok(map.view.fog[1]<map.view.far,`${map.id} fog ends before the far plane`);
  assert.ok(sum/(32*32)>90,`${map.id} paint is not black`);
 }
 assert.equal(terrainMap('baja').clear(terrainMap('baja').spawn.x,0),true);
});

test('height functions are cheap enough for the 361² mesh and live sand tiles',()=>{
 for(const map of terrainMaps){
  const t=performance.now();let s=0;for(let i=0;i<130000;i++)s+=map.height((i%361)*2.5-450,Math.floor(i/361)*2.5-450);
  assert.ok(Number.isFinite(s));assert.ok(performance.now()-t<1500,`${map.id} too slow`);
 }
});

test('each map rides on its own soil with deformable sand',()=>{
 for(const map of terrainMaps){
  const s=createState({physicsMode:'classic',height:map.height,spawn:map.spawn,soil:map.soil,heroRocks:false});
  assert.equal(s.physics.sand.profile.plough,map.soil.plough);
  for(let i=0;i<360;i++)stepBike(s,{gas:i>30},1/120);
  assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y),map.id);
  assert.ok(s.speed>2,`${map.id} speed ${s.speed}`);assert.equal(s.crashed,false,map.id);
  assert.ok(s.physics.sand.soil.size>0,map.id);
 }
});
