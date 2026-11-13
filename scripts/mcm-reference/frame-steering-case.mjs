import {prepareMcmFrameSteering} from '../../src/physics/mcm/frame-steering.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
export function evaluateFrameSteering(words){
 const v=words.map(bitsFloat),c={bike:{field724:words[0],field564:v[3],field5ec:v[4],field6f4:v[5],field8c8:v[8],field848:v[10],field73c:v[11],field6ec:v[12],field700:v[13]},riderComponentLimit:v[1],componentAngle:v[2],frameEntry:{iterations:words[6]|0,dt:v[7],rawDelta:v[9],control28:0}};
 const r=prepareMcmFrameSteering(c,'player');
 return [r.limit,c.frameEntry.control28,r.burst,c.bike.field700,r.derivative].map(floatBits);
}
