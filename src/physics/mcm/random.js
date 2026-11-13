// Pinned original CRT rand(), 0x4bf190..0x4bf1be. One stream per application
// thread, shared by all bike consumers; draw only at an executed rand() call.
export function createMcmRandom(seed=1){
 let state=seed>>>0,calls=0;
 return {get state(){return state;},get calls(){return calls;},draw(){
  state=(Math.imul(state,214013)+2531011)>>>0;calls++;
  return (state>>>16)&32767;
 }};
}
export function connectMcmRandom(c,random){
 const drawRandom=()=>random.draw();
 c.drawRandom=drawRandom;c.engine.drawRandom=drawRandom;
 c.contactPhase.normalEventDecision.drawRandom=drawRandom;
 c.contactPhase.normalEventSetup.drawRandom=drawRandom;
}
