// Original 0x454f70 routing for positive logical actions, option=0, output=NULL.
// 0x452670 maps keyboard actions; 0x454760 maps the secondary device. Neither
// option-zero lookup polls the OS. Missing observations must never imply neutral.
export function loadLiveFrameActions(memory,controller,used){
 const read=address=>{used.push(address);return memory.u32(address);};
 const actions=Object.fromEntries([4,5,6,7,8,9].map(action=>[action,0]));
 if(!controller)return actions;
 for(let i=0;i<4;i++)if(read(controller+0x10+i*4))throw Error('Uncaptured joystick action routing');
 for(const [offset,mapOffset,stateOffset] of [[0x24,0,0x288],[0x20,0x3e8,0x298]]){
  const device=read(controller+offset);if(!device)continue;
  const owner=read(device+4);if(!owner)throw Error('Missing action device owner');
  const map=read(owner+0x7dc);if(!map)continue;
  for(const action of Object.keys(actions)){
   const code=read(map+mapOffset+Number(action)*4);if(code===0xffffffff)continue;
   if(code>255)throw Error('Unsupported action code');
   const pressed=read(device+stateOffset+code*20)===1;
   actions[action]=+(!!actions[action]||pressed);
  }
 }
 return actions;
}
