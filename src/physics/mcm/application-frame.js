// Original 467ff0 / 467f40. Clock, input, optional service and virtual calls
// stay explicit; reads after callbacks preserve the original mutation ordering.
export function initializeMcmApplicationClock(app,memory,services){
 const tick=services.clock()>>>0;
 memory.put32(app+0x468,tick);
 memory.put32(app+0x464,tick);
 return tick;
}
export function tickMcmApplication(app,memory,services){
 const {u32,put32}=memory;
 const invoke=(name,...args)=>{
  if(typeof services[name]!=='function')throw Error(`Unconnected application service: ${name}`);
  return services[name](...args);
 };
 if(!u32(app+0x468))initializeMcmApplicationClock(app,memory,{clock:()=>invoke('clock')});
 else put32(app+0x464,invoke('clock')>>>0);
 // DWORD subtraction then signed FILD, scaled by the original float32 constant.
 const delta=Math.fround(((u32(app+0x464)-u32(app+0x468))|0)*Math.fround(0.001));
 const input=u32(app+0x10);
 if(input)invoke('input',input,delta);
 if(!u32(app+0x444)){
  const optional=u32(app+0x318);
  if(optional)invoke('optional',optional,delta);
  const root=u32(app+0x430);
  invoke('virtual',u32(u32(root)+0x2c),root,delta);
  const table=u32(app);
  invoke('virtual',u32(table+0x24),app);
  invoke('virtual',u32(table+0x2c),app);
  invoke('owner',u32(app+8));
 }
 put32(app+0x468,u32(app+0x464));
 return 1;
}
