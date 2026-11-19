import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRetroBike,pixelTexture} from '../src/retro-bike.js';

const triangles=root=>{let n=0;root.traverse(o=>{if(o.isMesh){const g=o.geometry;n+=(g.index?g.index.count:g.attributes.position.count)/3;}});return n;};

test('retro bike is low-poly, flat shaded and uses pixel textures',()=>{
 const r=createRetroBike(),wheel=r.wheel();
 const total=triangles(r.chassis)+triangles(r.bars)+triangles(wheel)*2+triangles(r.rider.root)+triangles(r.frontFender);
 assert.ok(total<1500,`retro bike has ${total} triangles`);
 for(const m of Object.values(r.materials))assert.equal(m.flatShading,true);
 for(const t of Object.values(r.textures)){assert.equal(t.magFilter,T.NearestFilter);assert.ok(t.image.width<=16);}
 for(const kind of ['forkUpper','forkLower','swingarm','brace','shock','axle']){const l=r.link(kind);assert.ok(l.geometry.isBufferGeometry);assert.ok(l.material.isMaterial);}
});

test('pixel plates spell the race number',()=>{
 const t=pixelTexture(4,2,(x,y)=>[x*60,y*100,0]);assert.deepEqual([...t.image.data.slice(0,4)],[0,0,0,255]);assert.deepEqual([...t.image.data.slice(28,32)],[180,100,0,255]);
 const plate=createRetroBike({number:'98'}).textures.plate.image,ink=plate.data[0];
 let inked=0;for(let i=0;i<plate.data.length;i+=4)if(plate.data[i]===ink)inked++;
 assert.ok(inked>60&&inked<200,`plate has ${inked} ink pixels`);
});

test('retro rider keeps hands on the bars and boots on the pegs',()=>{
 const {rider}=createRetroBike();
 for(const pose of [{},{compression:.8,bank:.6,steer:.3,lean:1},{bank:-.7,steer:-.4,lean:-1}]){
  rider.update(pose);
  for(const l of rider.limbs){
   const hand=new T.Vector3(l.side*.48,0,0).applyAxisAngle(new T.Vector3(0,1,0),pose.steer??0).add(new T.Vector3(0,1.34,.7));
   assert.ok(l.glove.position.distanceTo(hand)<1e-6);
   assert.ok(Math.abs(l.boot.position.x-l.side*.31)<1e-6&&Math.abs(l.boot.position.y-.43)<1e-6);
   for(const seg of [l.upperArm,l.forearm,l.thigh,l.shin])assert.ok(seg.scale.y>.2&&seg.scale.y<.6);
  }
 }
});
