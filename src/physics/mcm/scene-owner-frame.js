// Original 494820, called by 467f40 after drawing/presentation. Equality,
// rather than modulo, controls the ring index, including unusual input states.
export function advanceMcmSceneOwner(owner){
 const index=(owner.getUint32(0x3c,true)+1)>>>0;
 owner.setUint32(0x3c,index===owner.getUint32(0x38,true)?0:index,true);
 const count=(owner.getUint32(0x40,true)+1)>>>0;
 owner.setUint32(0x40,count,true);
 return count;
}
