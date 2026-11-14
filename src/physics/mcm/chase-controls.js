const f=Math.fround,buf=new ArrayBuffer(4),fv=new Float32Array(buf),uv=new Uint32Array(buf);const bits=v=>{fv[0]=v;return uv[0];};
const clamp=v=>(bits(v)|0)>0x3fc66666?f(1.55):bits(v)>0xbfc66666?f(-1.55):v;
const wrap=v=>(bits(v)|0)>0x40490fdb?f(v-f(2*Math.PI)):bits(v)>0xc0490fdb?f(v+f(2*Math.PI)):v;
// Original 0x47b52a..0x47c30c, excluding fixed-target/free-camera controls.
// Inputs are raw keyboard/joystick records, not observed query return values.
export function stepMcmChaseControls(s,input){
 if(input.usePrevious && input.freeCamera)throw new RangeError('Unrecovered free-camera controls');
 if(input.mode===5)throw new RangeError('Unrecovered fixed-target controls');
 const {mode,active,delta,keys,joystick,count,pov,button2:b2,button3:b3,modifierA,modifierB,multiplierField}=input;
 const mods=modifierA||modifierB;let motion=0;
 const dt=f(delta*30),scale=()=> (bits(s.radius)|0)<0x42480000?3-s.radius*f(.04):1;
 const pitch=change=>{s.pitch=clamp(f(s.pitch+(scale()*change)*.01745329));};
 const yaw=change=>{s.yaw=wrap(f(s.yaw+(scale()*change)*.01745329));};
 const radius=sign=>{s.radius=f(s.radius+sign*dt);if((bits(s.radius)|0)<0x40e00000)s.radius=7;motion=1;};
 if(!active)s.reset=0;
 else if(mode===3||mode===6)s.reset=1;
 else{
  if(keys&1){pitch(dt);motion=1;}if(keys&2){pitch(-dt);motion=1;}
  if(keys&4){yaw(dt);motion=1;}if(keys&8){yaw(-dt);motion=1;}
  if(keys&48)radius(1);if(keys&192)radius(-1);
  if(joystick){
   let x=0,y=0;if(count>0&&pov!==0xffffffff&&pov!==0xffff){const angle=f(pov*f(.00017453290638513863));x=f(Math.sin(angle));y=f(Math.cos(angle));}
   if(count>0){pitch(y*dt);yaw(-(x*dt));if((bits(x)&0x7fffffff)||(bits(y)&0x7fffffff))motion=1;}
   if(count<=0||(x===0&&y===0)){if(mods&&b2===1)radius(1);if(mods&&b3===1)radius(-1);}
  }
 }
 return {motionGate:motion,multiplier:f(multiplierField/109)};
}
