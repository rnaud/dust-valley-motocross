import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,stepBike,terrain,track,TAU} from '../src/world.js';
test('throttle moves bike and braking stops it',()=>{const s=createState();for(let i=0;i<240;i++)stepBike(s,{gas:true},1/120);assert.ok(s.speed>15);assert.ok(s.z>15);for(let i=0;i<360;i++)stepBike(s,{brake:true},1/120);assert.equal(s.speed,0);});
test('boost consumes charge and recovers when released',()=>{const s=createState();for(let i=0;i<120;i++)stepBike(s,{gas:true,boost:true},1/120);assert.ok(s.boost<70);for(let i=0;i<120;i++)stepBike(s,{},1/120);assert.ok(s.boost>75);});
test('steering changes direction and physics remains finite',()=>{const s=createState();for(let i=0;i<10000;i++)stepBike(s,{gas:true,left:true,boost:true},1/120);for(const key of ['x','y','z','speed','yaw','pitch'])assert.ok(Number.isFinite(s[key]),key);assert.ok(s.yaw< -1);assert.ok(s.y>=terrain(s.x,s.z)+.79);});
test('terrain supports closed circuit and airborne landings',()=>{assert.ok(Math.abs(track(0).x-track(TAU).x)<.001);const s=createState();s.air=true;s.y+=8;s.vy=4;let landing=0;for(let i=0;i<600;i++){const r=stepBike(s,{},1/120);landing=Math.max(landing,r.landed);}assert.ok(landing>1);assert.equal(s.air,false);});
