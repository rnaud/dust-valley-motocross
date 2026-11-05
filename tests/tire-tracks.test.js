import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TireTracks} from '../src/tire-tracks.js';
test('tread follows contact, breaks across air and resets, and stays bounded',()=>{
 const trails=new TireTracks(new THREE.Scene(),{capacity:4});const height=(x,z)=>x*.2+z*.1;
 const contact=z=>[{x:0,y:0,z},null];
 trails.update(contact(0),height);trails.update(contact(.5),height);assert.equal(trails.count,1);
 trails.update([],height);trails.update(contact(1),height);assert.equal(trails.count,1);
 trails.update(contact(1.5),height);assert.equal(trails.count,2);
 trails.breakTrail();trails.update(contact(20),height);assert.equal(trails.count,2);
 for(let z=20.5;z<25;z+=.5)trails.update(contact(z),height);
 assert.equal(trails.count,4);assert.equal(trails.geometry.drawRange.count,24);
 for(let i=0;i<trails.positions.length;i+=3)assert.ok(Math.abs(trails.positions[i+1]-height(trails.positions[i],trails.positions[i+2])-.035)<1e-5);
 trails.clear();assert.equal(trails.count,0);
});
