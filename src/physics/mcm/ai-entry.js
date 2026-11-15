import {floatBits as bits,bitsFloat as float} from './math.js';
const f=Math.fround;
// Original 0x46d240..0x46d3c2, including the empty-route return. The optional
// route-data callback must preserve partial file writes and is attempted once;
// its return status does not affect the original loaded flag.
export function prepareMcmAiEntry(c,loadRouteData){
 const result={proceed:false,throttle:0,brake:1,jumpCount:c.jumpCount>>>0,routeIndex:c.routeIndex,routeDataLoaded:c.routeDataLoaded,stage:null};
 if(!c.routeHead)return result;
 result.proceed=true;result.brake=0;
 if(c.fieldb6c&255)result.jumpCount=(result.jumpCount+1)>>>0;
 const target=c.routeTable[c.routeIndex];if(target===undefined)throw Error('Missing AI target table entry');
 const mode=c.mode&65535,raceActive=mode!==0&&(c.raceSetting&65535)!==0&&c.raceContext!==0;
 if(!result.routeDataLoaded&&mode!==1){loadRouteData();result.routeDataLoaded=1;}
 let pitchAngle=f(f(Math.PI/2)-c.pitch);if(bits(c.upY)>0x80000000)pitchAngle=-pitchAngle;
 result.stage={target,raceActive,turnScale:0,cos:float(mode===2?0x3f780aa5:0x3f6683b4),sin:float(mode===2?0x3e7d5777:0x3edeb3cd),pitchAngle,speed:c.speed,velocityHeading:f(Math.atan2(c.vx,c.vz)),heading:c.heading};
 if((c.routeIndex|0)>=(c.routeCount|0))result.routeIndex=0;
 return result;
}
