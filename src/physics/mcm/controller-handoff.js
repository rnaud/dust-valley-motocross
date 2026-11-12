// Original 0x4ab7fd..0x4ab99f, with state-zero branch exiting at 0x4abb30.
// Names retain unresolved controller flags and transition-kind meanings.
export function updateMcmControllerHandoff(c){
 let velocity=[...c.controllerVelocity],angularVelocity=[...c.controllerAngularVelocity];
 if(c.state844&&(c.controller13c||c.controller140)){
  velocity=[...(c.field8b4===2&&c.otherVelocity?c.otherVelocity:c.linearVelocity)];
  if(c.field8b4===4||c.field8b4===7){
   velocity[1]=Math.fround(velocity[1]+Math.min(Math.abs(c.linearVelocity[1]),35));
   angularVelocity=[...c.angularVelocity];
  }else angularVelocity=c.angularVelocity.map(v=>Math.fround(v*.75));
 }
 return {velocity,angularVelocity};
}
