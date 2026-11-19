import test from 'node:test';
import assert from 'node:assert/strict';
import {TrackMap,TRACK_DEPTH} from '../src/sand-trackmap.js';
import {SandSurface} from '../src/sand-physics.js';
import {SandSpray} from '../src/sand-fx.js';
import {terrainMap} from '../src/terrain-maps.js';
import {createState,stepBike} from '../src/world.js';

const dunes=terrainMap('dunes').soil;
const seeded=(seed=7)=>()=>((seed=Math.imul(seed^(seed>>>15),2246822507)+1>>>0)/4294967296);

test('track map records ruts, berms and disturbance with a tight dirty box',()=>{
 const m=new TrackMap(256);
 m.record(10,-20,-.2);m.record(10.1,-20,-.05);m.record(12,-20,.1);
 const rut=m.sample(10,-20);assert.ok(Math.abs(rut.depth-.2)<TRACK_DEPTH/255+1e-9,'deepest value wins in a shared texel');assert.equal(rut.disturbed,true);
 assert.ok(m.sample(12,-20).lift>.09);assert.equal(m.sample(100,100).disturbed,false);
 const b=m.takeDirty();assert.ok(b.maxX-b.minX<=2&&b.maxY-b.minY===1);assert.equal(m.takeDirty(),null);
 m.record(999,0,-.1);assert.equal(m.takeDirty(),null,'outside the world is ignored');
 const v=m.version;m.clear();assert.equal(m.version,v+1);assert.equal(m.sample(10,-20).depth,0);
 // Texel rows follow v=(z+450)/900, as the terrain shader samples them.
 assert.equal(m.texel(-450,-450),0);assert.equal(m.texel(449.9,449.9),256*256-1);
});

test('sand changes are observed into the track map while riding',()=>{
 const m=new TrackMap(512),s=createState({physicsMode:'classic',flat:true,height:()=>0,soil:dunes,heroRocks:false});
 s.physics.sand.onCells=(cells,sand)=>m.observe(cells,sand);
 for(let i=0;i<360;i++)stepBike(s,{gas:i>30},1/120);
 let deepest=0;for(let z=-2;z<=Math.max(2,s.z);z+=.25)deepest=Math.max(deepest,m.sample(s.x,z).depth);
 assert.ok(deepest>.03,`recorded rut depth ${deepest}`);
});

test('a sliding body gouges a crater, bulldozes a pile ahead and reports spray',()=>{
 const sand=new SandSurface(()=>0,{soil:dunes});
 for(let i=0;i<30;i++)sand.gouge(0,0,4,0,1/120);
 assert.ok(sand.displacementAt(0,0)<-.05,'crater under the contact');assert.ok(sand.displacementAt(.75,0)>sand.displacementAt(-.75,0),'pile ahead, not behind');
 assert.ok(sand.events.length>0&&sand.events.at(-1).amount>0);
 const still=new SandSurface(()=>0,{soil:dunes});still.gouge(0,0,.2,0,1/120);assert.equal(still.soil.size,0,'no gouge when barely moving');
 const hard=new SandSurface(()=>0);hard.gouge(0,0,5,0,1/120);assert.equal(hard.soil.size,0,'default soil has no gouging');
});

test('deposited sand conserves volume and loosens the surface',()=>{
 const sand=new SandSurface(()=>0,{soil:dunes});sand.deposit(1,1,.004,.35);
 let sum=0;for(const tile of sand.soil.values())for(const d of tile.delta)sum+=d*.0625;
 assert.ok(Math.abs(sum-.004)<1e-7);
});

test('spray: dust billows behind a driven wheel, clods land back as sand',()=>{
 const spray=new SandSpray({dustCount:200,clodCount:60,random:seeded()}),sand=new SandSurface(()=>0,{soil:dunes});
 const ctx={soil:dunes,contacts:[{x:0,y:0,z:0},{x:0,y:0,z:1.4}],velocity:{x:0,y:0,z:9},throttle:1,events:[],height:()=>0,deposit:(x,z,v)=>sand.deposit(x,z,v)};
 for(let i=0;i<30;i++)spray.step(1/60,ctx);
 assert.ok(spray.activeDust>15,`dust ${spray.activeDust}`);
 const behind=spray.dust.filter(p=>p.life>0).reduce((n,p)=>n+(p.vz<0),0);assert.ok(behind>spray.activeDust*.7,'dust is thrown backwards');
 const p=spray.dust.find(d=>d.life>0),early=SandSpray.dustLook(p);p.age=p.life*.6;const later=SandSpray.dustLook(p);assert.ok(later.size>early.size,'puffs grow');
 assert.ok(spray.activeClods>0,'roost throws clods');
 for(let i=0;i<420;i++)spray.step(1/60,{...ctx,contacts:[],events:[]});
 assert.equal(spray.activeClods,0);assert.equal(spray.activeDust,0,'dust settles out');
 assert.equal(sand.soil.size,0,'roost clods are visual; their sand is already in the roost mound');
 const calm=new SandSpray({random:seeded()});calm.step(1/60,{...ctx,velocity:{x:0,y:0,z:.5}});assert.equal(calm.activeDust,0,'no dust when crawling');
 const burst=new SandSpray({random:seeded()});burst.step(1/60,{soil:dunes,events:[{x:0,z:0,vx:3,vz:0,amount:.02}],height:()=>0});
 assert.ok(burst.activeClods>=5&&burst.activeDust>=5,'impacts throw a burst');
 let landed=0;for(let i=0;i<300;i++)burst.step(1/60,{soil:dunes,height:()=>0,deposit:(x,z,v)=>{landed+=v;}});
 assert.ok(Math.abs(landed-.02)<1e-9,'impact clods return exactly the gouged sand they carry');
});

test('a tumbling bike ploughs the dunes on wild soil',()=>{
 const s=createState({physicsMode:'classic',flat:true,height:()=>0,soil:dunes,heroRocks:false}),b=s.physics.chassis;
 b.quaternion.setFromEuler(0,0,Math.PI/2);b.position.y=.45;b.velocity.set(5,0,0);
 for(let i=0;i<60;i++)stepBike(s,{},1/120);
 assert.ok(s.physics.sand.events.length>0,'body contact produced spray events');
});

test('terramechanics: Bekker sinkage grows with load and slip; sand caps traction',async()=>{
 const t=await import('../src/terramechanics.js'),tire={b:.14,D:1.22},soil={...t.DRY_SAND,CI:60e3};
 const light=t.tireOnSand(700,0,tire,soil),heavy=t.tireOnSand(1100,0,tire,soil),spin=t.tireOnSand(1100,.5,tire,soil);
 assert.ok(light.sinkage>.02&&light.sinkage<.06,`sinkage ${light.sinkage}`);
 assert.ok(heavy.sinkage>light.sinkage&&spin.sinkage>heavy.sinkage*1.5,'heavier and spinning tires dig deeper');
 assert.ok(spin.resistance>heavy.resistance*2,'wheelspin bogs down');
 assert.ok(heavy.tractionLimit/1100<.9&&heavy.tractionLimit/1100>.4,'loose sand grip well below the arcade 2.4');
 assert.ok(t.tireOnSand(1100,0,tire,{...soil,CI:600e3}).tractionLimit>heavy.tractionLimit,'firmer soil grips more');
 assert.equal(t.tireOnSand(0,0,tire,soil).sinkage,0);
 // Closed form satisfies Bekker's law: z0 from the formula at W.
 const z=t.bekkerSinkage(1000,.14,1.22),p=(990/.14+1528430)*z**1.1;assert.ok(p>2e4&&p<1e5,`contact pressure ${p}`);
});

test('wild soils conserve the sand a riding bike displaces',()=>{
 const s=createState({physicsMode:'classic',flat:true,height:()=>0,soil:dunes,heroRocks:false});
 for(let i=0;i<600;i++)stepBike(s,{gas:i>30},1/120);
 let volume=0,moved=0;for(const tile of s.physics.sand.soil.values())for(const d of tile.delta){volume+=d*.0625;moved+=Math.abs(d)*.0625;}
 assert.ok(moved>.01,`moved ${moved} m³`);assert.ok(Math.abs(volume)<moved*.03,`net ${volume} m³ of ${moved} m³ moved`);
 assert.ok(s.sandContact.some(c=>c&&c.sinkage>0),'tires report Bekker sinkage');
});
