import {floatBits,bitsFloat} from './math.js';
import {mcmMultiply as mul,mcmSubtract as sub} from './x87-arithmetic.js';
import {invalidateMcmTransform} from './event-orientation.js';
const f=Math.fround,signed=v=>floatBits(v)|0;

// Physical-state tail of 0x40fbb0. Legacy visualPresent actually denotes the
// collider at rider+0x34. The callback restores pair mode 3 and normal collision
// callbacks (0x40b9e0/0x40ba00); this routine does not reparent scene transforms.
export function clearMcmCrashRider(c){
 const r=c.rider;
 if(r.visualPresent){
  if(!c.restoreRiderVisual)throw new Error('Rider visual restoration is not connected');
  c.restoreRiderVisual(r);
 }
 r.field154=-1;r.fieldf8=1;r.field138=0;r.flag13c=0;r.field140=0;r.active16c=0;r.field144=0;
}

// Original 0x4b0610..0x4b0a69. +884 remains a raw word in the retained adapter.
export function decideMcmFrameReset(c,delta){
 const b=c.bike,r=c.rider,s=c.resetDecision;
 let queries=0,cleanupCalls=0;
 const cleanup=()=>{clearMcmCrashRider(c);cleanupCalls++;};
 const done=(code,branch)=>({code,branch,queries,cleanupCalls});
 const clearCrash=()=>{b.field884=0;b.field844=0;b.field8b0=0;cleanup();};
 if(b.field88c){
  clearCrash();b.position=new Float64Array(b.spawnPosition);
  for(let i=0;i<3;i++)c.bodyNode.local[12+i]=b.position[i];
  invalidateMcmTransform(c.bodyNode);return done(1,'forced-position');
 }
 if(s.setting&&signed(b.fieldbd8)>0x40c00000){
  if(b.field844){b.field844=0;b.field884=0;cleanup();}
  return done(1,'elapsed');
 }
 if(s.controllerPresent){
  queries++;const pressed=s.queryReset();
  if(pressed&&!s.setting){
   if(b.field844)cleanup();
   b.field844=b.field884=b.field8b0=0;return done(2,'button');
  }
 }
 b.fieldc40=0;
 if(s.mode!==3){
  const low=mul(s.worldScale,105),high=mul(s.worldScale,s.mode===2?1175:1687);
  if(low>b.position[0])b.fieldc40=1;else if(!(high>=b.position[0]))b.fieldc40=2;
  if(low>b.position[2])b.fieldc40=3;else if(!(high>=b.position[2]))b.fieldc40=4;
 }
 if(b.fieldc40&&!b.field844&&(floatBits(b.field594)<=0x80000000||floatBits(b.field590)<=0x80000000)&&signed(b.position[1])>0x41a00000){
  b.field844=b.field8b0=b.field884=0;return done(1,'boundary');
 }
 b.fieldc40=0;
 if(!b.field844)return done(0,'continue');
 if((b.field884&0x7fffffff)&&r.field154>0){
  b.field884=floatBits(f(sub(bitsFloat(b.field884),delta)));
  const timer=bitsFloat(b.field884);
  if(timer>b.field87c)r.field154=-1;
  else if((b.field884|0)<=0){
   if(!(b.field884&0x7fffffff))b.field884=floatBits(f(-.1));
   if(b.field894>.866||signed(b.field564)<0x3f800000||(b.field884>>>0)>=0xc0000000){
    clearCrash();return done(1,'crash-expired');
   }
  }
 }
 if(!r.active16c)b.field844=0;
 else if(!b.field844)b.field844=1;
 if(!b.field844){b.field884=0;cleanup();return done(1,'rider-inactive');}
 return done(0,'crash-active');
}
