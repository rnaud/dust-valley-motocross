// Original 0x459e90. Lists contain bike objects (or null), including readable
// sentinel entries: the original reads an entry before checking the end cursor.
export function nextMcmBike(world, cursor) {
 if (world.disabled) return {bike:null,cursor};
 const n=world.playerCount;
 const bike=n===1&&cursor===0?world.player:
  n>cursor?world.players[cursor]:world.others?.[cursor-n];
 cursor=(cursor+1)|0;
 if ((n>1?n:1)+world.otherCount<cursor) return {bike:null,cursor:0};
 return {bike:bike??null,cursor};
}

// Original 0x4a16d0..0x4a17ba, before angle/animation changes.
export function selectMcmNearbyBike(world, self) {
 let cursor=0,nearest=null,best=3.4028234663852886e38;
 for (;;) {
  const next=nextMcmBike(world,cursor);cursor=next.cursor;
  const bike=next.bike;if(!bike)break;
  if(bike.disabled||bike===self)continue;
  const dx=Math.fround(bike.position[0]-self.position[0]);
  const dz=bike.position[2]-self.position[2];
  const square=dz*Math.fround(dz)+dx*dx;
  if(square<best){nearest=bike;best=Math.fround(square);}
 }
 return nearest;
}
