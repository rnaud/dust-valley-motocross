import {primaryMcmCollision,secondaryMcmCollision} from '../../src/physics/mcm/collision-callback.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateCollisionCallback(v){
 const bike={field8ac:v[2],field618:v[3],state844:v[4],field8a8:v[5],field888:1.25};
 const other={field8ac:v[10]?0:v[6],field888:2.5},op=v[10]?bike:other;
 const tag={player:v[8]?bike:other,holder:v[9]===1?bike:v[9]===2?other:null};
 const calls=[],id=x=>x===bike?1:x===other?2:0;
 const c={bike,other:op,collisionType:v[1],tag:v[7]?tag:null,
 respond:c=>calls.push(1,id(c.bike),c.collisionType,1),
 resetTag:()=>calls.push(2,1,id(tag.holder),0),
 notifyTag:(a,b,flag)=>calls.push(3,id(a),id(b),flag)};
 (v[0]?secondaryMcmCollision:primaryMcmCollision)(c);
 return [bike.field8ac,bike.field8a8,floatBits(bike.field888),other.field8ac,floatBits(other.field888),id(tag.holder),calls.length,...calls,...Array(16-calls.length).fill(0)];
}
