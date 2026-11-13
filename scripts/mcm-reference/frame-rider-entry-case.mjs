import {floatBits} from '../../src/physics/mcm/math.js';
const integers=['844','710','714','bfc','614','618','724','72c','820','824','814'];
// +828 is still an uninterpreted word in the reset path; encode its original
// float storage here rather than numerically converting it to an integer.
const floats=['728','730','734','848','818','81c','82c','830','834','4e0','828'];
export const frameRiderEntryLabels=[...integers,...floats,'position.x','position.y','position.z','normal.x','normal.y','normal.z','offset.x','offset.y','offset.z','componentAngle',...['bike','rider'].flatMap(o=>['4','10','14','30','2c'].map(k=>`${o}+${k}`)),...['bike','rider'].flatMap(o=>Array.from({length:6},(_,i)=>`${o}.bounds.${i}`)),'bike.remainder','rider.remainder'];
export function frameRiderEntryWords(c){
 const b=c.bike,s=c.loopRider;
 return [...integers.map(k=>b[`field${k}`]>>>0),...floats.map(k=>floatBits(b[`field${k}`])),...[b.position,b.normal,b.offset].flatMap(v=>Array.from(v,floatBits)),floatBits(c.componentAngle),...s.bikeAnimation.map(v=>v>>>0),...s.riderAnimation.map(v=>v>>>0),...[b.boundsMin,b.boundsMax,s.riderBounds].flatMap(v=>Array.from(v,floatBits)),floatBits(b.field8),0];
}
