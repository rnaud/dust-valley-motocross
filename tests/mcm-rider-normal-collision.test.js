import {compareRiderNormalPrimary} from '../scripts/mcm-reference/compare-rider-normal-primary.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {compareRiderNormalSecondary} from '../scripts/mcm-reference/compare-rider-normal-secondary.mjs';
import {primaryMcmNormalRiderCollision} from '../src/physics/mcm/rider-normal-collision.js';
test('restored rider secondary callback matches 3072 native cases including tag ordering and height threshold',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/rider-normal-secondary-wine11.json',import.meta.url)));
 const input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 for(const [name,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture[name+'Sha256']);
 assert.deepEqual(compareRiderNormalSecondary(input,output),{cases:3072,words:70656,differences:[]});
});
test('normal rider primary preserves class gates and requires active-animation dependencies',()=>{
 const rider={flag140:1,contactClass:0},bike={state844:0};
 primaryMcmNormalRiderCollision({rider,bike,collisionType:1});assert.equal(rider.contactClass,0);
 assert.throws(()=>primaryMcmNormalRiderCollision({rider,bike,collisionType:0}),/Missing active rider collision dependencies/);
 rider.flag140=0;let calls=0;
 primaryMcmNormalRiderCollision({rider,bike,collisionType:2,respond(){calls++;}});assert.equal(calls,1);assert.equal(rider.contactClass,2);
 rider.contactClass=3;bike.state844=1;
 primaryMcmNormalRiderCollision({rider,bike,collisionType:2,respond(){calls++;}});assert.equal(calls,1);assert.equal(rider.contactClass,3);
});

test('normal rider primary matches original active-animation impulses, transforms, bounds and pair state',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/rider-normal-primary-wine11.json',import.meta.url)));
 const input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 for(const [name,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture[name+'Sha256']);
 assert.deepEqual(compareRiderNormalPrimary(input,output),{cases:256,words:22016,differences:[]});
});
