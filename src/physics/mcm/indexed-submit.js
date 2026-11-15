// Pinned Wine wined3d 1c3ed0. Debug logging is outside this model.
// Lock/emit/unlock are explicit external calls and may change the context.
export function submitMcmIndexedDraw(context,args,{lock=()=>{},emit,unlock=()=>{}}){
 if(args.length!==5)throw Error('Expected five indexed draw arguments');
 const state=context.state;
 if(context.device.immediate===context)lock();
 if(state.indexBuffer)emit([state.field1a4>>>0,state.field1a8>>>0,...args.map(x=>x>>>0),1]);
 // Native code reads this identity again after emission; do not cache it.
 if(context.device.immediate===context)unlock();
}
