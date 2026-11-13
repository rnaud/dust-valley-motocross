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

// Original selection and angle gate through 0x4a1847. A missing candidate leaves
// the previous angle untouched. Wrapping is one correction, not a modulo.
export function evaluateMcmNearbyInteraction(world,self,heading,previousAngle){
 const bike=selectMcmNearbyBike(world,self);
 if(!bike)return {bike:null,angle:previousAngle,accepted:false};
 let angle=Math.fround(Math.atan2(bike.position[0]-self.position[0],bike.position[2]-self.position[2])-heading);
 if(angle < -Math.PI)angle=Math.fround(angle+Math.fround(2*Math.PI));
 else if(angle > Math.PI)angle=Math.fround(angle-Math.fround(2*Math.PI));
 return {bike,angle,accepted:Math.abs(angle)>Math.fround(.698)};
}
