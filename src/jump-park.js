const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Each feature has a takeoff, a broad top and a long landing. No painted circuit.
export const jumps=[
 {x:0,z:22,yaw:0,height:1.5,up:8,top:9,down:18,width:12},
 {x:0,z:67,yaw:0,height:2.2,up:11,top:13,down:24,width:14},
 {x:0,z:126,yaw:0,height:2.8,up:13,top:17,down:30,width:16},
 {x:-56,z:15,yaw:0,height:1.1,up:6,top:4,down:10,width:11},
 {x:-56,z:43,yaw:0,height:1.5,up:8,top:6,down:14,width:12},
 {x:-56,z:83,yaw:.15,height:3.6,up:14,top:18,down:32,width:17},
 {x:32,z:-42,yaw:Math.PI/2,height:2.2,up:10,top:12,down:24,width:15},
 {x:92,z:25,yaw:-.8,height:2.6,up:12,top:15,down:26,width:15},
 {x:-95,z:-42,yaw:.6,height:1.3,up:8,top:5,down:13,width:12},
 {x:0,z:188,yaw:0,height:1.25,up:5,top:2,down:9,width:12},
 {x:0,z:218,yaw:0,height:1.9,up:6,top:3,down:12,width:14},
 {x:0,z:252,yaw:0,height:2.5,up:7,top:4,down:16,width:16},
 {x:38,z:86,yaw:.2,height:1.45,up:6,top:2,down:10,width:11},
 {x:-42,z:120,yaw:-.35,height:1.7,up:7,top:2,down:12,width:12},
];
function coordinates(j,x,z){const dx=x-j.x,dz=z-j.z;return {along:dx*Math.sin(j.yaw)+dz*Math.cos(j.yaw),across:dx*Math.cos(j.yaw)-dz*Math.sin(j.yaw)};}
export function parkHeight(x,z,natural){
 const blend=1-smooth((Math.hypot(x,z)-140)/70);
 const basin=1.8+.35*Math.sin(x*.025)+.45*Math.sin(z*.02);
 let height=natural+(basin-natural)*blend;
 for(const j of jumps){
  const {along:t,across}=coordinates(j,x,z),end=j.up+j.top+j.down;
  if(t<0||t>end||Math.abs(across)>j.width+8)continue;
  const lateral=1-smooth((Math.abs(across)-j.width*.65)/(j.width*.35+8));
  const profile=t<j.up?Math.pow(t/j.up,1.5):t<j.up+j.top?1:1-smooth((t-j.up-j.top)/j.down);
  height+=j.height*profile*lateral;
 }
 return height;
}
export function inJumpZone(x,z){return jumps.some(j=>{const p=coordinates(j,x,z);return p.along>-5&&p.along<j.up+j.top+j.down+8&&Math.abs(p.across)<j.width+5;});}
