import {floatBits} from './math.js';
import {rotateMcmTransform} from './transform.js';

// Original 0x49ebf0, rotating suspension component at bike+0x8e8.
export function updateMcmRotatingSuspension(c) {
  const f=Math.fround;
  let travel=c.travel,displacement=[...c.displacement],matrix=[...c.matrix];
  const limited=+(c.limit<=travel);
  let angle;
  if(limited) {
    displacement=displacement.map(v=>f(v*(c.limit/travel)));
    travel=c.limit;angle=c.limitAngle;
  } else angle=f(travel/c.divisor);
  let dt=c.dt;
  if(floatBits(c.previousHeight)>0x80000000)dt=f((c.height/(c.height-c.previousHeight))*dt);
  let cacheValid=c.cacheValid;
  if(Number.isFinite(angle)){matrix=rotateMcmTransform(matrix,[1,0,0],angle);cacheValid=0;}
  const ratio=(c.previousTravel-travel)/(travel*dt);
  const velocity=displacement.map(v=>f(v*ratio));
  return {travel,displacement,velocity,matrix,previousTravel:travel,limited,
    increasing:+(c.previousTravel<=travel),cacheValid,rotationApplied:Number.isFinite(angle)};
}
