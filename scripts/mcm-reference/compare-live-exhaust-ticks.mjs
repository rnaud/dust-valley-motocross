import {tickMcmExhaust} from '../../src/physics/mcm/exhaust-tick.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';
export function compareLiveExhaustTicks(rows){
if(!rows.length||rows.length%2)throw Error('Expected complete exhaust tick pairs');
const reports=[];
for(let i=0;i<rows.length;i+=2){
 const before=rows[i],after=rows[i+1];if(before.phase!=='before-exhaust'||after?.phase!=='after-exhaust'||before.frame!==after.frame||before.dtBits!==after.dtBits||before.emitter!==after.emitter||before.pool!==after.pool||before.paused!==after.paused||before.playerActive!==0||after.playerActive!==0)throw Error('Invalid trace pair');
 const e=Buffer.from(before.emitterHex,'hex'),p=Buffer.from(before.particlesHex,'hex'),view=b=>new DataView(b.buffer,b.byteOffset,b.length),pool={count:before.count,particle:n=>view(p.subarray(n*0x38,(n+1)*0x38))};
 tickMcmExhaust(view(e),{dt:bitsFloat(before.dtBits),paused:before.paused,pool});
 const diff=[];let words=1;for(const [name,b,hex]of [['emitter',e,after.emitterHex],['particles',p,after.particlesHex]]){const original=Buffer.from(hex,'hex');for(let j=0;j<b.length;j+=4){words++;if(b.readUInt32LE(j)!==original.readUInt32LE(j))diff.push({name,offset:j,actual:b.readUInt32LE(j),original:original.readUInt32LE(j)});}}
 if(pool.count!==after.count)diff.push({name:'count',actual:pool.count,original:after.count});reports.push({frame:before.frame,dt:bitsFloat(before.dtBits),playerActive:before.playerActive,emitted:after.count-before.count,words,differences:diff});
}
return reports;
}
