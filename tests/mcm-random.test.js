import test from 'node:test';
import assert from 'node:assert/strict';
import {createMcmRandom} from '../src/physics/mcm/random.js';
import {updateMcmGears} from '../src/physics/mcm/gears.js';
import {decideMcmBikeEvent} from '../src/physics/mcm/event-decision.js';
import {startMcmRiderEvent} from '../src/physics/mcm/rider-event.js';

test('shared draws preserve launch order and skip inactive shifts and empty rider groups',()=>{
 const random=createMcmRandom(12345),drawRandom=()=>random.draw();
 updateMcmGears({shiftTimer:1,drawRandom});assert.equal(random.calls,0);
 const event=decideMcmBikeEvent({launch:1,target:[0,0,0],position:[0,0,0],velocity:[0,0,0],angularVelocity:[0,0,0],drawRandom});
 assert.deepEqual(event.angularVelocity,[Math.fround(19164/32768),Math.fround(7584/32768),Math.fround(.02)]);
 assert.equal(random.calls,2);
 const rider=startMcmRiderEvent({kind:0,records:[[[],[10,11,12],[20,21,22]]],velocity:[0,0,0],drawRandom});
 assert.equal(rider.randomCalls,2);assert.equal(rider.selected[0],0);
 assert.equal(random.calls,4);assert.equal(random.state,1449997005);
});
