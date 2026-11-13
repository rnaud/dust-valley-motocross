const f=Math.fround;

// Original 0x4a1a40. Used before rebuilding the bike pose in 0x49f8f0.
// Preserve unrelated state, and clear only the low byte of field814.
export function resetMcmBikeState(c){
 const b=c.bike;
 if(c.effect)c.effect.splice(0,4,0,f(b.field8cc*21),1,-1);
 for(const key of ['81c','704','708','700','6d8','6dc','6e0','6b4','738','73c','560','8bc','710','714','824','828','b4c','b3c','838','820','728','734','61c','844','884','8b0','870','8a8','5e4','718','564','6a4','848','850','84c','854','c70','c74','c78','6ac','6b0','4e4','4f0','590','594','6a8','bd8'])b[`field${key}`]=0;
 b.field620=1;b.field724=1;b.field72c=5;b.field730=.5;
 b.field814=(b.field814&0xffffff00)>>>0;
 b.field694=f(-b.field68c);
 const mass=b.field68c*f(.03105589933693409);
 b.mass=f(mass);b.inverseMass=f(1/mass);
 for(const key of ['velocity','acceleration','worldAngularVelocity','angularVelocity','axis624'])b[key]=[0,0,0];
 b.field4e8=b.field4ec=b.field4f4=1;b.localLever=[0,0,f(2.545)];
 if(c.front)c.front.limited=0;if(c.rear)c.rear.limited=0;
 if(c.component8e4){c.component8e4.value=[0,0,0];c.component8e4.field5c=0;}
 if(c.component8e8){c.component8e8.field58=0;c.component8e8.field5c=0;}
 if(c.engine){
  const e=c.engine,randomValue=c.drawRandom?c.drawRandom():c.randomValue;
  if(!Number.isInteger(randomValue)||randomValue<0||randomValue>32767)throw new RangeError('Bike reset requires an original CRT random draw');
  e.gear=e.rpmDemand=e.brake=e.state=e.previousRpmDemand=e.shiftTimer=0;e.released=1;
  e.shiftThreshold=f((randomValue*.000030517578125)*e.thresholdRanges[0]+e.thresholdBases[0]);
 }
 return {randomCalls:c.engine?1:0};
}
