export const TAU = Math.PI * 2;
export function track(t) { return { x: Math.cos(t) * (102 + 12 * Math.sin(t * 3)), z: Math.sin(t) * (78 + 9 * Math.sin(t * 2)) }; }
export function terrain(x,z) {
  const t = Math.atan2(z / 78, x / 102), p = track(t);
  const d = Math.hypot(x-p.x,z-p.z);
  const base = 1.7*Math.sin(x*.023)+1.8*Math.cos(z*.031)+.7*Math.sin((x+z)*.045);
  let jumps = 0;
  for(const a of [.58,1.5,2.7,3.8,5.15]) { const j=track(a); jumps += 5.5*Math.exp(-((x-j.x)**2+(z-j.z)**2)/90); }
  const hills = (Math.sin(x*.044)*Math.cos(z*.038)*6 + Math.sin(z*.018+x*.014)*7) * Math.min(1,Math.max(0,(d-12)/40));
  return base + jumps + hills;
}
export function trackDistance(x,z) { let best=Infinity; for(let i=0;i<160;i++){const p=track(i/160*TAU);best=Math.min(best,Math.hypot(x-p.x,z-p.z));}return best; }
export function createState() { const p=track(0);return {x:p.x,z:p.z,y:terrain(p.x,p.z)+.8,yaw:Math.atan2(36,78),speed:0,vy:0,pitch:0,air:false,airtime:0,boost:100}; }
export function stepBike(s,input,dt) {
  const gas=input.gas?1:0, brake=input.brake?1:0, turn=(input.right?1:0)-(input.left?1:0);
  const boosting=input.boost&&s.boost>0&&gas;
  s.boost=Math.max(0,Math.min(100,s.boost+(boosting?-32:12)*dt));
  s.speed+=(gas*(boosting?23:14)-brake*26-s.speed*.32-(gas?0:2))*dt;
  s.speed=Math.max(0,Math.min(boosting?47:34,s.speed));
  s.yaw+=turn*dt*(.3+Math.min(s.speed/18,1)*1.35)*(s.air?.48:1);
  s.x+=Math.sin(s.yaw)*s.speed*dt;s.z+=Math.cos(s.yaw)*s.speed*dt;
  const floor=terrain(s.x,s.z)+.8;
  const slope=(terrain(s.x+Math.sin(s.yaw)*1.6,s.z+Math.cos(s.yaw)*1.6)-terrain(s.x-Math.sin(s.yaw)*1.6,s.z-Math.cos(s.yaw)*1.6))/3.2;
  let landed=0;
  if(s.air){s.vy-=20*dt;s.y+=s.vy*dt;s.airtime+=dt;s.pitch+=((brake-gas)*1.9-s.pitch*.35)*dt;if(s.y<=floor){s.y=floor;s.air=false;landed=s.airtime;s.airtime=0;s.vy=0;}}
  else {const targetV=slope*s.speed;if(s.vy-targetV>2.5&&s.speed>10){s.air=true;s.y+=s.vy*dt;s.airtime=dt;}else{s.y=floor;s.vy=targetV;s.pitch+= (Math.atan(slope)-s.pitch)*Math.min(1,dt*12);}}
  return {landed,crashed:landed>0&&Math.abs(s.pitch)>1.15,boosting};
}
