import {updateMcmRotatingContact} from './rotating-contact.js';

// Original caller block 0x4a7b33..0x4a7c46, after upstream branch selection.
export function updateMcmRotatingResponse(c) {
  if(c.height!==0&&!c.anyContact&&c.state!==2) {
    const r=updateMcmRotatingContact(c);
    return {...r,height:Math.fround(c.height-r.compression),
      point:c.point.map((v,j)=>Math.fround(v+r.displacement[j])),active:1};
  }
  return {height:c.height,point:[...c.point],displacement:[...c.displacement],
    velocity:[...c.suspensionVelocity],compression:0,travel:c.travel,
    matrix:[...c.matrix],previousTravel:0,limited:c.limited,
    contactLimited:Number(!!c.anyContact||c.state===2),cacheValid:c.cacheValid,active:0};
}
