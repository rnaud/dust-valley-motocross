import test from 'node:test';
import assert from 'node:assert/strict';
import {getBalanceSteer,getSteerCommand,getSafeBrakeFactor} from '../src/controller.js';

test('balance steer is zero upright and changes sign with lean',()=>{
 assert.ok(Math.abs(getBalanceSteer(15,0))<1e-12);
 assert.ok(getBalanceSteer(15,.6)*getBalanceSteer(15,-.6)<0);
});
test('balance steer grows with lean and shrinks with speed',()=>{
 assert.ok(Math.abs(getBalanceSteer(15,.8))>Math.abs(getBalanceSteer(15,.4)));
 assert.ok(Math.abs(getBalanceSteer(25,.8))<Math.abs(getBalanceSteer(15,.8)));
});
test('Bike Lab steering law steers off balance toward a new lean target',()=>{
 const straight=getSteerCommand({speed:18,lean:0,targetLean:0});
 const request=getSteerCommand({speed:18,lean:0,targetLean:.8});
 assert.ok(Math.abs(request)>Math.abs(straight),'requesting lean must steer off balance');
});
test('safe-brake factor falls with bank',()=>{
 assert.equal(getSafeBrakeFactor(0),1);
 assert.ok(getSafeBrakeFactor(.8)<getSafeBrakeFactor(.3));
 assert.ok(getSafeBrakeFactor(2)>=.44);
});
