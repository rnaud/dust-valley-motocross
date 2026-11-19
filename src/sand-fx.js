import * as THREE from 'three';
import {createSizedPoints} from './sized-points.js';
import {fbm} from './terrain-maps.js';

// A cloudy puff: fractal noise inside a soft radial falloff (reads as billowing
// dust rather than a flat disc). Alpha only; colour comes from the tint.
export function createCloudTexture(size=64){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1,r=Math.hypot(u,v),fall=Math.max(0,1-r*r);
  const n=fbm(u*2.2+7,v*2.2-3,4,11),a=Math.max(0,Math.min(1,fall*fall*(.35+1.1*n)));
  data.set([255,255,255,Math.round(a*255)],(y*size+x)*4);
 }
 const t=new THREE.DataTexture(data,size,size);t.magFilter=t.minFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
}

// Sand spray for soft-soil maps:
//  - dust: soft billboards that billow out behind the tires, grow, drift
//    downwind and hang in the air for a few seconds;
//  - clods: small chunks thrown by roost and by crash gouges, which fly
//    ballistically and rebuild a little mound where they land.
// Simulation is plain JS (testable headless); rendering is one instanced
// sprite draw and one InstancedMesh draw.
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class SandSpray{
 constructor({dustCount=420,clodCount=220,random=Math.random}={}){
  this.random=random;
  this.dust=Array.from({length:dustCount},()=>({life:0,age:0,x:0,y:-1e4,z:0,vx:0,vy:0,vz:0,size:0,grow:0,alpha:0}));
  this.clods=Array.from({length:clodCount},()=>({life:0,x:0,y:-1e4,z:0,vx:0,vy:0,vz:0,r:0,spin:0}));
  this.dustCursor=0;this.clodCursor=0;this.carry=[0,0,0];this.wind={x:0,z:0};
 }
 emitDust(x,y,z,vx,vy,vz,size=.6,grow=1.2,life=3,alpha=.5){
  const p=this.dust[this.dustCursor++%this.dust.length];
  Object.assign(p,{life,age:0,x,y,z,vx,vy,vz,size,grow,alpha});
 }
 // volume: sand (m³) the clod carries and deposits on landing (0 = visual only).
 emitClod(x,y,z,vx,vy,vz,r,volume=0){
  const c=this.clods[this.clodCursor++%this.clods.length],rand=this.random;
  Object.assign(c,{life:3,x,y,z,vx,vy,vz,r,spin:(rand()-.5)*20,volume});
 }
 // ctx: {soil, contacts:[rear,front] ({x,y,z}|null), velocity:{x,y,z}, throttle,
 //       events:[{x,z,vx,vz,amount}], height(x,z), deposit(x,z,volume)}
 step(dt,ctx){
  const rand=this.random,soil=ctx.soil??{},dustiness=soil.dust??0,roost=soil.roost??0,v=ctx.velocity??{x:0,y:0,z:0};
  const speed=Math.hypot(v.x,v.z),fx=speed>.1?v.x/speed:0,fz=speed>.1?v.z/speed:0;
  if(dustiness>0)(ctx.contacts??[]).forEach((hit,i)=>{
   if(!hit)return;
   // Rear tire (index 0) throws most of the dust, more under power.
   const rate=dustiness*clamp((speed-1.5)/8,0,1)*(i===0?70+90*(ctx.throttle??0):26);
   this.carry[i]+=rate*dt;
   while(this.carry[i]>=1){
    this.carry[i]--;const a=rand()*TAU,side=(rand()-.5)*1.6;
    this.emitDust(hit.x+Math.cos(a)*.25,hit.y+.1,hit.z+Math.sin(a)*.25,
     -fx*speed*(.18+rand()*.12)+fz*side,.5+rand()*1.4,-fz*speed*(.18+rand()*.12)-fx*side,
     .9+rand()*.7,1.6+rand()*1.6,2.8+rand()*2.4,.6+rand()*.25);
   }
   // Roost: grains and small clods kicked back from the driven tire.
   if(i===0&&roost>0&&(ctx.throttle??0)>.2&&speed>2){
    this.carry[2]+=roost*ctx.throttle*clamp(speed/10,0,1)*30*dt;
    while(this.carry[2]>=1){this.carry[2]--;this.emitClod(hit.x,hit.y+.15,hit.z,-fx*(2+rand()*3)+(rand()-.5),1.5+rand()*2.5,-fz*(2+rand()*3)+(rand()-.5),.03+rand()*.04);}
   }
  });
  // Body impacts: a dense dust burst plus chunks thrown up and along.
  for(const e of ctx.events??[]){
   const y=ctx.height?ctx.height(e.x,e.z):0,n=Math.min(14,Math.round(e.amount*500)),es=Math.hypot(e.vx,e.vz)||1;
   for(let k=0;k<n;k++)this.emitClod(e.x,y+.1,e.z,e.vx*(.3+rand()*.4)+(rand()-.5)*2,2+rand()*3.5,e.vz*(.3+rand()*.4)+(rand()-.5)*2,.06+rand()*.1,n?e.amount/n:0);
   const puffs=Math.min(10,2+Math.round(e.amount*300));
   for(let k=0;k<puffs;k++)this.emitDust(e.x+(rand()-.5),y+.2,e.z+(rand()-.5),e.vx/es*(1+rand()*2)+(rand()-.5),.6+rand()*1.5,e.vz/es*(1+rand()*2)+(rand()-.5),.8+rand()*.6,1.6+rand()*1.5,3+rand()*2,.45);
  }
  const wind=this.wind,drag=Math.exp(-dt*1.3);
  for(const p of this.dust){
   if(p.life<=0)continue;p.age+=dt;if(p.age>=p.life){p.life=0;p.y=-1e4;continue;}
   p.vx=(p.vx-wind.x)*drag+wind.x;p.vz=(p.vz-wind.z)*drag+wind.z;p.vy=p.vy*drag+.18*dt;
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
  }
  for(const c of this.clods){
   if(c.life<=0)continue;c.life-=dt;c.vy-=9.81*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;
   const ground=ctx.height?ctx.height(c.x,c.z):0;
   // Roost clods are visual (the roost mound is already in the soil); impact
   // clods carry their share of the gouged sand back down.
   if(c.y<=ground||c.life<=0){if(c.volume>0&&ctx.deposit)ctx.deposit(c.x,c.z,c.volume);c.life=0;c.y=-1e4;}
  }
 }
 // Opacity and size of a dust puff at its current age.
 static dustLook(p){const t=p.age/p.life;return {size:p.size+p.grow*p.age,alpha:p.alpha*Math.min(1,p.age*5)*(1-t)**1.6};}
 get activeDust(){return this.dust.reduce((n,p)=>n+(p.life>0),0);}
 get activeClods(){return this.clods.reduce((n,c)=>n+(c.life>0),0);}
 clear(){for(const p of this.dust){p.life=0;p.y=-1e4;}for(const c of this.clods){c.life=0;c.y=-1e4;}this.carry.fill(0);}
}

export class SandFx{
 constructor(scene,{mobile=false,dustTexture}={}){
  this.spray=new SandSpray({dustCount:mobile?160:360,clodCount:mobile?80:220});
  // Instanced sprites (see sized-points.js); sizes are world metres, converted
  // to point units from the camera field of view every frame.
  this.points=createSizedPoints({count:this.spray.dust.length,map:createCloudTexture(),color:'#e2c79a'});this.baseTint=new THREE.Color('#e2c79a');this.forward=new THREE.Vector3();
  this.points.object.name='sand-dust';this.points.object.renderOrder=2;
  this.clodMaterial=new THREE.MeshStandardMaterial({color:'#d9bd8e',roughness:1,flatShading:true});
  this.clodMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),this.clodMaterial,this.spray.clods.length);
  this.clodMesh.castShadow=true;this.clodMesh.frustumCulled=false;this.clodMesh.count=0;this.clodMesh.name='sand-clods';
  this.root=new THREE.Group();this.root.add(this.points.object,this.clodMesh);scene.add(this.root);
  this.matrix=new THREE.Matrix4();this.quat=new THREE.Quaternion();this.euler=new THREE.Euler();this.pos=new THREE.Vector3();this.scaleV=new THREE.Vector3();this.time=0;
 }
 setLook({dust='#e2c79a',clod='#d9bd8e',wind={x:0,z:0}}={}){this.baseTint.set(dust);this.points.tint.value.set(dust);this.clodMaterial.color.set(clod);this.spray.wind={x:wind.x*.9,z:wind.z*.9};}
 update(dt,ctx,camera,sunDir){
  this.time+=dt;this.spray.step(dt,ctx);
  // Backlit dust glows (forward scattering): brighten as the view turns toward the sun.
  if(sunDir){camera.getWorldDirection(this.forward);const back=Math.max(0,this.forward.dot(sunDir));this.points.tint.value.copy(this.baseTint).multiplyScalar(.88+.75*back*back);}
  const toPoints=1/Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),{positions,sizes,alphas}=this.points;
  this.spray.dust.forEach((p,i)=>{
   if(p.life>0){const look=SandSpray.dustLook(p),near=Math.hypot(p.x-camera.position.x,p.y-camera.position.y,p.z-camera.position.z);
    // Puffs right at the camera fill the screen for little visual gain: fade and cull them.
    const fade=Math.min(1,Math.max(0,(near-2.5)/6));positions[i*3]=p.x;positions[i*3+1]=fade>0?p.y:-1e4;positions[i*3+2]=p.z;sizes[i]=look.size*toPoints;alphas[i]=look.alpha*fade;}
   else{positions[i*3+1]=-1e4;alphas[i]=0;sizes[i]=0;}
  });
  this.points.update();
  let k=0;
  for(const c of this.spray.clods){
   if(c.life<=0)continue;
   this.pos.set(c.x,c.y,c.z);this.quat.setFromEuler(this.euler.set(c.spin*this.time,c.spin*.7*this.time,0));this.scaleV.setScalar(c.r);
   this.clodMesh.setMatrixAt(k++,this.matrix.compose(this.pos,this.quat,this.scaleV));
  }
  this.clodMesh.count=k;this.clodMesh.instanceMatrix.needsUpdate=true;
 }
 clear(){this.spray.clear();this.clodMesh.count=0;}
}
