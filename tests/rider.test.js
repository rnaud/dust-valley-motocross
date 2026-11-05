import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createRider} from '../src/rider.js';

test('rider maintains limb lengths, grip contact and peg contact across the pose range',()=>{
 const rider=createRider();
 for(const compression of [0,.5,1])for(const bank of [-1,0,1])for(const lean of [-1,0,1])for(const steer of [-.65,0,.65]){
  rider.update({compression,bank,lean,steer});
  for(const limb of rider.limbs){
   const grip=new Vector3(limb.side*.49,0,0).applyAxisAngle(new Vector3(0,1,0),steer).add(new Vector3(0,1.34,.7));
   assert.ok(limb.glove.position.distanceTo(grip)<1e-10);
   assert.ok(Math.abs(limb.upperArm.scale.y-.43)<1e-8);
   assert.ok(Math.abs(limb.forearm.scale.y-.44)<1e-8);
   assert.ok(Math.abs(limb.thigh.scale.y-.49)<1e-8);
   assert.ok(Math.abs(limb.shin.scale.y-.48)<1e-8);
   assert.ok(limb.boot.position.distanceTo(new Vector3(limb.side*.31,.415,.1))<1e-10);
  }
 }
});
