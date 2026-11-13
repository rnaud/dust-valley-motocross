import {prepareMcmResetEngineEntry} from './reset-engine-entry.js';
// Consume the carried next-frame scheduler and controls at 0x4a5bc5.
export function prepareMcmFrameEngine(c){
 const e=c.frameEntry,p=c.contactPhase;
 if(e.iterations<=0)return null;
 Object.assign(p,{dt:e.dt,turnScale:e.inverseDt,control20:e.iterations,control1c:e.control1c,control30:e.control30,control2c:e.control2c});
 c.engineEntry.analog=e.analog;
 return prepareMcmResetEngineEntry(c);
}
