import {updateMcmSuspensionContact} from './suspension-contact.js';

// Original caller block 0x4a72b5..0x4a73e2. Upstream selects this suspension
// branch. Scratch outputs not assigned on the skipped path remain unchanged.
export function updateMcmSuspensionResponse(c) {
  if(c.height!==0&&!c.anyContact&&c.state!==2) {
    const r=updateMcmSuspensionContact(c);
    return {...r,height:Math.fround(c.height-r.compression),
      point:c.point.map((v,j)=>Math.fround(v+r.displacement[j])),active:1};
  }
  return {height:c.height,point:[...c.point],displacement:[...c.displacement],
    velocity:[...c.velocity],compression:0,travel:c.travel,
    translation:[...c.translation],previousDisplacement:[0,0,0],previousTravel:0,
    limited:c.limited,contactLimited:Number(!!c.anyContact||c.state===2),
    cacheValid:c.cacheValid,active:0};
}
