// Original 481310. Dependencies are live memory reads and explicit services;
// child traversal may change the menu/clock gates before the tail reads them.
export function beginMcmScene(address,delta,memory,services){
 const {u32,f32,put32}=memory;
 const invoke=(name,...args)=>{
  if(typeof services[name]!=='function')throw Error(`Unconnected scene service: ${name}`);
  return services[name](...args);
 };
 const app=()=>u32(0x4e4fb4);
 if(!u32(app()+0x614)){
  const mode=u32(address+0x54);
  const pressed=invoke('queryInput',u32(app()+0x10),10,0);
  if(mode&&!pressed){
   invoke('cameraVirtual',u32(address+0x40),0x10);
   invoke('selectCamera',u32(address+0x1c),u32(address+0x44));
   invoke('copyCamera',u32(address+0x44),u32(address+0x40));
   put32(address+0x54,0);
  }else if(!mode&&pressed){
   const camera=u32(address+0x40),target=u32(camera+0x1cc);
   if(!u32(target+0x618)&&u32(target+0x4bc)){
    invoke('cameraVirtual',camera,0x14);
    invoke('selectCamera',u32(address+0x1c),u32(address+0x40));
    invoke('copyCamera',u32(address+0x40),u32(address+0x44));
    put32(address+0x54,1);
   }
  }
  const environment=u32(address+0x38);
  if(environment){
   const owner=u32(address+0x1c),camera=u32(owner+0x2c),shape=u32(environment+0x6c);
   invoke('positionEnvironment',shape,[f32(camera+0x144),f32(shape+0x1c),f32(u32(owner+0x2c)+0x14c)],0,0);
  }
 }
}

// 481407 tail, also needed when an atomic checkpoint starts inside children.
export function finishMcmScene(address,delta,memory){
 const {u32,f32,put32,putFloat}=memory;
 const app=()=>u32(0x4e4fb4);
 if(u32(app()+0x614))return 1;
 if(!u32(u32(app()+0x618)+0x38)){
  putFloat(address+0x6c,f32(address+0x6c)+delta);
  if((u32(address+0x6c)|0)>=0x42700000){
   // Minutes stay in the x87 register across the loop; only the final value
   // is stored as float32. Seconds are rounded after each subtraction.
   let minutes=f32(address+0x68);
   do{
    minutes+=1;
    putFloat(address+0x6c,f32(address+0x6c)-60);
    if(u32(address+0x6c)>0x80000000)put32(address+0x6c,0);
   }while((u32(address+0x6c)|0)>=0x42700000);
   putFloat(address+0x68,minutes);
  }
 }
 return 1;
}

export function tickMcmScene(address,delta,memory,services){
 beginMcmScene(address,delta,memory,services);
 if(typeof services.children!=='function')throw Error('Unconnected scene service: children');
 services.children(address,delta);
 return finishMcmScene(address,delta,memory);
}
