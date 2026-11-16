// Native bike+8b0 is another bike pointer. Resolve it at the time of the
// controller/event read: collision impulses may already have changed that bike.
export function connectMcmOtherBikeState(context,actors){
 const other=()=>{
  const address=context.bike.field8b0;
  if(!address)return null;
  const actor=actors.get(address);
  if(!actor||actor.kind!=='bike')throw Error(`Missing live other bike ${address.toString(16)}`);
  return actor;
 };
 context.otherBikeVelocity=()=>{const actor=other();return actor?[...actor.velocity]:[0,0,0];};
 return {get speed(){return other()?.speed??0;}};
}
