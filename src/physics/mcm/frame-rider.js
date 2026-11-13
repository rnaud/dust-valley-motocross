import {updateMcmCrashFrameAnimation} from './crash-frame-animation.js';
import {updateMcmNormalFrameRider} from './normal-frame-rider.js';
import {updateMcmTrickFrameRider} from './trick-frame-rider.js';
import {updateMcmNearbyFrameRider} from './nearby-frame-rider.js';
import {updateMcmRecoveryFrameRider} from './recovery-frame-rider.js';

// Original complete 0x4af710 dispatch. The caller provides live animation
// objects/assets, graph nodes and input callbacks; delta is the raw frame delta,
// distinct from the carry-inclusive interval used by the acceleration filter.
export function updateMcmFrameRider(c,delta){
 const b=c.bike;
 if(b.state){
  const crash={secondaryControl:b.secondaryControl,field730:b.fraction};
  updateMcmCrashFrameAnimation(crash,c.leanAngle,c.bikeAnimation,c.records[16],c.applyBike);
  b.fraction=crash.field730;return;
 }
 if(b.field710){
  if(((b.animation<<24)>>24)<0)updateMcmNearbyFrameRider(c,delta);
  else updateMcmTrickFrameRider(c,delta);
 }else if(b.fieldbfc===2)updateMcmRecoveryFrameRider(c,delta);
 else updateMcmNormalFrameRider(c);
}
