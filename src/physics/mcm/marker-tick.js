// Original 475450: child traversal, visibility timers, repeat gate, rotation.
// Shape rotation and child dispatch remain explicit world-owned services.
export function tickMcmMarker(view,delta,{children,rotate}){
 const u=o=>view.getUint32(o,true),v=o=>view.getFloat32(o,true);
 const put=(o,x)=>view.setUint32(o,x>>>0,true),set=(o,x)=>view.setFloat32(o,x,true);
 children(delta);
 if(u(0x60)){
  if(!(v(0x64)>=v(0x6c)))put(0x34,0);
  else set(0x6c,v(0x6c)+delta);
 }
 if(u(0x74)&&!u(0x70)){
  set(0x7c,v(0x7c)+delta);
  if(!(v(0x78)>=v(0x7c))){
   if((u(0x80)|0)>(u(0x84)|0)||u(0x80)===999){put(0x70,1);put(0x84,u(0x84)+1);}
   put(0x7c,0);
  }
 }
 if(!u(0x70))return 1;
 if(u(0x8c)){
  set(0x9c,v(0xa0)*delta);
  // Native double comparison and float32 subtraction use different constants.
  while(v(0x9c)>6.283185307179586)set(0x9c,v(0x9c)-6.2831854820251465);
  rotate(u(0x30),[v(0x90),v(0x94),v(0x98)],v(0x9c));
 }
 return 1;
}
