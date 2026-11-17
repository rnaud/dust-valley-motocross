import * as THREE from 'three';
import * as C from 'cannon-es';
import {resetBike} from './world.js';
import {terrainIndices} from './height-grid.js';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const remixLevels=[
 {id:'train',name:'The Last Train',tag:'CHASE A MOVING FINISH',description:'Race over ten moving carriages or take the ground route. Board again before the canyon and catch the engine in 100 seconds.',color:0xdf8053,sky:0xc2d8dc,laps:1},
 {id:'erase',name:'Erase the World',tag:'DRAW YOUR SECOND LAP',description:'An eraser is chasing you. Your tire trail becomes solid ink. On lap two, the paper disappears: ride the path you drew.',color:0x334eb0,sky:0xf2eddf,laps:2},
 {id:'kitchen',name:'Rush Hour, Size Small',tag:'BREAKFAST IS THE OBSTACLE',description:'Two laps across a giant breakfast table. Catch the toaster launch, avoid spilled coffee, and time the dishwasher bridge.',color:0xe7ab56,sky:0xb5d6ca,laps:2},
 {id:'giant',name:'The Sleeping Giant',tag:'DON’T WAKE THE MOUNTAIN',description:'Ride a breathing creature above the clouds. Stay smooth for the long route, or wake it to open a shorter, bucking route.',color:0x648d94,sky:0xc6dcf0,laps:1},
 {id:'opponent',name:'The Track Is Your Opponent',tag:'TEACH IT. THEN BEAT IT.',description:'Throttle grows jumps; braking narrows and bends the circuit. After each lap, lock one sector. Finish three laps of your evolving track.',color:0x6a467d,sky:0x28243d,laps:3}
];
export class RemixWorld{
 constructor(id){
  this.spec=remixLevels.find(l=>l.id===id);if(!this.spec)throw Error('Unknown remix '+id);
  this.id=id;this.time=0;this.lap=1;this.next=1;this.passed=0;this.result=null;this.choicePending=false;this.checkpoint=0;this.wake=0;this.awake=false;this.trails=[];this.tiles=[];this.train=[];this.bodies=[];this.materials=new Map();this.sectors=Array.from({length:4},()=>({tune:.3,locked:false}));this.root=new THREE.Group();this.root.name='remix-'+id;this.refreshClock=0;this.lastTrail=null;this.launches=0;this.launchCooldown=0;this.coffeeTime=0;this.bridgeOpen=true;
  this.spawn=id==='train'?{x:0,z:8,yaw:0}:{x:0,z:0,yaw:1.0};
  this.height=(x,z)=>this.surfaceHeight(x,z);
 }
 route(t){const a=t*TAU-Math.PI/2;if(this.id==='giant'&&this.awake&&t>.5)return {x:0,z:140*(2-2*t)};const sector=this.sectors[Math.min(3,Math.floor(((t%1+1)%1)*4))],bend=this.id==='opponent'?(1-sector.tune)*6*Math.sin(a*4):0;return {x:(45+bend)*Math.cos(a),z:70+70*Math.sin(a)};}
 target(){if(this.id==='train')return{x:0,z:this.time*4+[8,50,100,150,200,237][Math.min(this.next,5)]};return this.route(this.next/8);}
 floorHeight(x,z){
  if(this.id==='train')return z>270&&z<360?-24:0;
  if(this.id==='giant'){
   const r=(x/88)**2+((z-70)/110)**2;if(r>1)return -28;
   const back=9+4*(1-r),breath=Math.sin(this.time*.65)*.8;
   const wave=Math.sin(z*.075-this.time*(this.awake?1.1:.45))*(this.awake?.85:.18);
   return back+breath+wave;
  }
  if(this.id==='opponent'){
   let t=(Math.atan2((z-70)/70,x/45)+Math.PI/2)/TAU;t=(t+1)%1;
   const p=this.route(t),sector=this.sectors[Math.floor(t*4)],distance=Math.hypot(x-p.x,z-p.z),width=8+sector.tune*6;
   const road=1-clamp((distance-width)/7,0,1),jump=Math.max(0,Math.sin(t*TAU*8))**4*sector.tune*2.4;
   return -4+(4+jump)*road;
  }
  if(this.id==='kitchen'&&x< -32&&x> -58&&z>57&&z<83)return -16;
  return 0;
 }
 surfaceHeight(x,z){
  if(this.id==='train'&&Math.abs(x)<6){const local=z-this.time*4;if(local>=0&&local<=240&&local%24<22)return 4.5;}
  if(this.id==='kitchen'&&x< -32&&x> -58&&z>57&&z<83&&this.bridgeOpen)return .2;
  return this.floorHeight(x,z);
 }
 material(color){if(!this.materials.has(color))this.materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.88}));return this.materials.get(color);}
 box(size,position,color,{solid=false,moving=false,parent=this.root}={}){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),this.material(color));mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  let body;if(solid){body=new C.Body({mass:0,type:moving?C.Body.KINEMATIC:C.Body.STATIC});body.addShape(new C.Box(new C.Vec3(...size.map(v=>v/2))));body.position.set(...position);this.world.addBody(body);this.bodies.push(body);}return{mesh,body};
 }
 sphere(radius,position,color,scale=[1,1,1]){const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,20,12),this.material(color));mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;this.root.add(mesh);return mesh;}
 attach(state,scene){
  this.state=state;this.world=state.physics.world;this.scene=scene;this.oldBackground=scene.background;this.oldFog=scene.fog.color.clone();scene.background=new THREE.Color(this.spec.sky);scene.fog.color.set(this.spec.sky);scene.add(this.root);
  if(this.id==='erase')this.buildPaper();else this.buildFloor();
  if(this.id==='train')this.buildTrain();if(this.id==='kitchen')this.buildKitchen();if(this.id==='giant')this.buildGiant();if(this.id==='opponent')this.buildOpponent();
  this.beacons=Array.from({length:this.id==='train'?6:8},(_,i)=>{const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(7,.22,6,32),this.material(0xe4ff69));g.add(ring);const pole=new THREE.Mesh(new THREE.BoxGeometry(.18,8,.18),this.material(0xffffff));pole.position.set(-7,-4,0);g.add(pole);const p2=pole.clone();p2.position.x=7;g.add(p2);this.root.add(g);return g;});
  if(this.id!=='train'){
   this.routeDots=Array.from({length:80},(_,i)=>{const dot=new THREE.Mesh(new THREE.SphereGeometry(.35,6,4),this.material(0xe4ff69));this.root.add(dot);return dot;});
  }
  this.updateVisuals();
 }
 buildFloor(){
  const extent=this.id==='train'?800:190,segments=this.id==='train'?160:96,spacing=extent*2/segments,data=[];
  for(let i=0;i<=segments;i++){const row=[];for(let j=0;j<=segments;j++)row.push(this.floorHeight(i*spacing-extent,extent-j*spacing));data.push(row);}
  const shape=new C.Heightfield(data,{elementSize:spacing}),body=new C.Body({mass:0});body.addShape(shape);body.quaternion.setFromEuler(-Math.PI/2,0,0);body.position.set(-extent,0,extent);this.world.addBody(body);this.bodies.push(body);
  const geo=new THREE.PlaneGeometry(extent*2,extent*2,segments,segments);geo.rotateX(-Math.PI/2);geo.setIndex(terrainIndices(segments));const mesh=new THREE.Mesh(geo,this.material(this.spec.color));mesh.receiveShadow=true;this.root.add(mesh);this.floor={shape,body,mesh,segments,spacing,extent};this.refreshFloor();
 }
 refreshFloor(){if(!this.floor)return;const{shape,body,mesh,segments,spacing,extent}=this.floor,pos=mesh.geometry.attributes.position;
  for(let i=0;i<=segments;i++)for(let j=0;j<=segments;j++)shape.data[i][j]=this.floorHeight(i*spacing-extent,extent-j*spacing);
  shape.update();shape.updateMinValue();shape.updateMaxValue();shape.updateBoundingSphereRadius();body.aabbNeedsUpdate=true;this.world.broadphase.dirty=true;
  for(let i=0;i<pos.count;i++)pos.setY(i,this.floorHeight(pos.getX(i),pos.getZ(i)));pos.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
 }
 buildTrain(){
  for(let i=0;i<10;i++){
   const car=this.box([12,3,22],[0,3,i*24+11],i%2?0x536f7c:0xa94c3c,{solid:true,moving:true});car.base=i*24+11;this.train.push(car);
   for(const x of [-5,5])for(const z of [-7,7]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.7,12),this.material(0x28303a));wheel.rotation.z=Math.PI/2;wheel.position.set(x,-1.7,z);car.mesh.add(wheel);}
   if(i>0&&i<9){const cargo=this.box([3,2,8],[i%2?-3.6:3.6,5.5,i*24+12],0xe1b866,{solid:true,moving:true});cargo.base=i*24+12;this.train.push(cargo);}
  }
  this.engine=this.sphere(3,[0,6,237],0x242c38,[1,1,1.7]);
  // Side ramps connect the alternate ground route to carriage height.
  for(const z of [35,125,225])for(const side of [-1,1]){const ramp=this.box([6,.8,22],[side*9,2.2,z],0xc7a26c,{solid:true});ramp.mesh.rotation.x=-.2;ramp.body.quaternion.setFromEuler(-.2,0,0);}
  for(let z=-50;z<750;z+=6){this.box([17,.15,.8],[0,.12,z],0x4c3a30);}
  for(const x of [-4,4])this.box([.22,.25,800],[x,.2,350],0x555b63);
  for(const z of [265,365])this.box([90,22,4],[0,-11,z],0x9e6c54);
 }
 buildPaper(){
  // The ink starting pad closes the loop even when the eraser reaches the first tiles.
  this.box([28,.22,28],[0,.04,0],0x344faf,{solid:true});
  for(let x=-72;x<72;x+=12)for(let z=-24;z<168;z+=12){const tile=this.box([12,.4,12],[x+6,-.2,z+6],0xf4efdc,{solid:true});this.tiles.push(tile);}
  this.eraser=this.box([24,5,12],[0,2,0],0xee7395).mesh;this.box([24,1,5],[0,2.6,1],0x7187ad,{parent:this.eraser});
  for(let i=0;i<12;i++){const p=this.route(i/12);const pencil=this.box([1,1,15],[p.x*1.6,1,70+(p.z-70)*1.35],i%2?0xe9b33f:0x384e9b);pencil.mesh.rotation.y=i*.7;}
 }
 buildKitchen(){
  this.box([150,6,190],[0,-4,70],0x986a45);
  const toaster=this.box([24,14,17],[64,6,70],0xc8d1ce,{solid:true});for(const z of [-4,4])this.box([20,.3,2],[0,7.2,z],0x33373c,{parent:toaster.mesh});
  this.launchPad=this.box([14,.2,15],[45,.12,70],0xf1cf64).mesh;
  this.bridge=this.box([28,.5,28],[-45,-.05,70],0x879c9c,{solid:true,moving:true});
  this.box([30,14,20],[-74,6,70],0xe2e5d8,{solid:true});
  this.coffee=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({color:0x442d22,transparent:true,opacity:.85}));this.coffee.rotation.x=-Math.PI/2;this.coffee.position.set(27,.08,113);this.root.add(this.coffee);
  const cup=new THREE.Mesh(new THREE.CylinderGeometry(9,8,16,24),this.material(0x78aeb5));cup.position.set(63,8,120);cup.rotation.z=-.3;this.root.add(cup);
  for(const [x,z]of [[-4,60],[8,100]]){const plate=new THREE.Mesh(new THREE.CylinderGeometry(16,16,.6,32),this.material(0xf4eee2));plate.position.set(x,.35,z);this.root.add(plate);}
  for(let i=0;i<5;i++)this.box([15,1.2,12],[0,1+i*1.2,65],0xdeaa66);
  this.box([7,2,5],[0,8,65],0xffdf6a);
  for(let i=0;i<8;i++)this.sphere(1.4,[-20+i*5,.8,145],0xb95342);
  // A raised serving-board shortcut with a broad entry ramp.
  const ramp=this.box([17,1,26],[24,2,32],0xd4af77,{solid:true});ramp.mesh.rotation.x=-.14;ramp.body.quaternion.setFromEuler(-.14,0,0);
 }
 buildGiant(){
  this.sphere(1,[0,-3,70],0x526e84,[85,14,108]);this.head=this.sphere(1,[0,0,184],0x6c929b,[32,19,30]);
  for(const x of [-19,19]){this.sphere(3,[x,10,203],0xf1e2a3,[1,.15,1]);this.sphere(1.2,[x,10.6,204],0x27384e,[1,.15,1]);}
  for(let i=0;i<9;i++){const z=i*20-5;this.sphere(6,[-76,0,z],0x416477,[1,2,1]);this.sphere(6,[76,0,z],0x416477,[1,2,1]);}
  for(let i=0;i<22;i++)this.sphere(10,[Math.sin(i*2.4)*160,-17,70+Math.cos(i*2.4)*165],0xf4f2ed,[2,1,1.4]);
 }
 buildOpponent(){
  for(let i=0;i<32;i++){const p=this.route(i/32);this.box([2,16,2],[p.x*1.65,4,70+(p.z-70)*1.45],i%2?0xc07de4:0x73dacf);}
  this.core=this.sphere(10,[0,12,70],0x311f49);for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(14+i*3,.35,8,48),this.material(0xbb74e7));ring.rotation.x=i*.7;this.core.add(ring);}
 }
 addTrail(s){
  if(this.lap!==1||s.air||s.crashed)return;const previous=this.lastTrail;if(!previous){this.lastTrail={x:s.x,z:s.z};return;}
  const distance=Math.hypot(s.x-previous.x,s.z-previous.z);if(distance<2.5)return;if(distance>15){this.lastTrail={x:s.x,z:s.z};return;}
  const trail=this.box([8,.22,distance+.6],[(s.x+previous.x)/2,.04,(s.z+previous.z)/2],0x344faf,{solid:true});const yaw=Math.atan2(s.x-previous.x,s.z-previous.z);trail.mesh.rotation.y=yaw;trail.body.quaternion.setFromEuler(0,yaw,0);trail.body.aabbNeedsUpdate=true;this.trails.push(trail);this.lastTrail={x:s.x,z:s.z};
 }
 beforeStep(dt,input,s){
  if(this.result||this.choicePending)return;this.time+=dt;this.refreshClock+=dt;
  if(this.id==='train'){
   const onRoof=s.wheelContacts.some(p=>p&&p.y>3&&Math.abs(p.x)<6);if(onRoof)s.physics.chassis.position.z+=4*dt;
   for(const car of this.train){car.body.position.z=car.base+this.time*4;car.body.aabbNeedsUpdate=true;}if(this.time>=100)this.result={won:false,text:'The train escaped. Use the roofs and the ground ramps to catch it.'};
  }
  if(this.id==='erase'){
   const p=this.route((this.time*8-65)/370);this.eraser.position.set(p.x,2,p.z);this.eraser.rotation.y=Math.atan2(this.route((this.time*8-64)/370).x-p.x,this.route((this.time*8-64)/370).z-p.z);
   for(const tile of this.tiles)if(this.time*8>=65&&tile.mesh.visible&&Math.hypot(tile.mesh.position.x-p.x,tile.mesh.position.z-p.z)<18){tile.mesh.visible=false;this.world.removeBody(tile.body);}
   if(this.time*8>=65&&Math.hypot(s.x-p.x,s.z-p.z)<10)this.result={won:false,text:'The eraser caught you. Keep moving and draw a smooth line for lap two.'};
   this.addTrail(s);
  }
  if(this.id==='kitchen'){
   this.bridgeOpen=this.time%14<9;this.bridge.body.position.y=this.bridgeOpen?-.05:-12;this.bridge.body.aabbNeedsUpdate=true;
   const radius=this.lap===1?Math.min(19,10+this.time*.15):19;this.coffee.scale.setScalar(radius);
   if(Math.hypot(s.x-27,s.z-113)<radius&&!s.air){s.physics.chassis.velocity.x*=Math.exp(-dt*1.2);s.physics.chassis.velocity.z*=Math.exp(-dt*1.2);this.coffeeTime+=dt;}
   this.launchCooldown=Math.max(0,this.launchCooldown-dt);
   if(Math.abs(s.x-45)<7&&Math.abs(s.z-70)<7.5&&!s.air&&this.launchCooldown===0){s.physics.chassis.velocity.y=8;this.launchCooldown=3;this.launches++;}
  }
  if(this.id==='giant'){
   if(!this.awake)this.wake=clamp(this.wake+dt*((input.brake&&s.speed>5?6:0)+(input.boost?10:0)+(s.crashed?12:0)-.3),0,100);
   if(this.wake>=100)this.awake=true;
  }
  if(this.id==='opponent'){const t=((Math.atan2((s.z-70)/70,s.x/45)+Math.PI/2)/TAU+1)%1,sector=this.sectors[Math.floor(t*4)];if(!sector.locked){const desired=input.brake?0:input.gas?1:.35;sector.tune+=(desired-sector.tune)*dt*.5;}}
  if(['giant','opponent'].includes(this.id)&&this.refreshClock>.12){this.refreshFloor();this.refreshClock=0;}
 }
 afterStep(s){
  if(this.result||this.choicePending)return;
  if(s.y< -10){this.result={won:false,text:this.id==='erase'?'You fell through the erased page. Your ink is the road.':'You fell off the route. Restart, or use recovery before the fall.'};return;}
  const p=this.target();if(Math.hypot(s.x-p.x,s.z-p.z)<(this.id==='train'?10:this.id==='erase'&&this.next===0?3:13)&&Math.abs(s.y-this.height(p.x,p.z))<8){
   this.checkpoint=this.next;this.checkpointPosition={x:s.x,z:s.z,yaw:s.yaw};this.passed++;
   if(this.id==='train'){if(this.next===5&&s.y>3)this.result={won:true,text:'You caught the engine before the canyon swallowed the route.'};else if(this.next<5)this.next++;}
   else if(this.next===0){
    this.lap++;if(this.lap>this.spec.laps)this.result={won:true,text:this.id==='erase'?'Two laps, one road. You rode the line you drew.':this.id==='giant'?(this.awake?'You rode the awakened giant’s shortcut.':'You crossed without waking the giant.'):'Remix complete. You beat the changing world.'};
    else {if(this.id==='erase'){for(const tile of this.tiles)if(tile.mesh.visible){tile.mesh.visible=false;this.world.removeBody(tile.body);}resetBike(s,this.spawn.x,this.spawn.z,this.spawn.yaw);this.resetPose=true;}if(this.id==='opponent')this.choicePending=true;}
    this.next=1;
   }else this.next=(this.next+1)%8;
  }
 }
 wakeGiant(){if(this.id==='giant'){this.wake=100;this.awake=true;}}
 lockSection(index){if(!this.choicePending||!this.sectors[index]||this.sectors[index].locked)return false;this.sectors[index].locked=true;this.choicePending=false;return true;}
 recovery(){if(this.id==='erase'&&this.checkpointPosition)return {...this.checkpointPosition};const p=this.id==='train'?{x:0,z:this.time*4+[8,50,100,150,200,237][this.checkpoint]}:this.route(this.checkpoint/8);const next=this.target();return{...p,yaw:Math.atan2(next.x-p.x,next.z-p.z)};}
 updateVisuals(){
  if(this.id==='train'){for(const car of this.train)car.mesh.position.z=car.body.position.z;this.engine.position.z=237+this.time*4;}
  if(this.id==='kitchen')this.bridge.mesh.position.y=this.bridge.body.position.y;
  if(this.id==='giant'&&this.head)this.head.position.y=Math.sin(this.time*.65)*.8;
  if(this.core)this.core.rotation.y=this.time*.2;
  this.routeDots?.forEach((dot,i)=>{const p=this.route(i/80);dot.position.set(p.x,this.height(p.x,p.z)+.3,p.z);dot.visible=this.id!=='erase'||this.lap===1;});
  this.beacons?.forEach((g,i)=>{const p=this.id==='train'?{x:0,z:this.time*4+[8,50,100,150,200,237][i]}:this.route(i/8);g.position.set(p.x,this.height(p.x,p.z)+5,p.z);const q=this.id==='train'?{x:0,z:p.z+1}:this.route((i+.02)/8);g.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);g.visible=i===this.next;});
 }
 status(){let detail='Follow the lime checkpoint rings.';if(this.id==='train')detail=`${Math.max(0,100-Math.floor(this.time))}s to catch the engine · roofs or ground ramps`;if(this.id==='erase')detail=this.lap===1?'Draw a smooth line. Your ink survives the eraser.':'Paper gone. Your first-lap ink is the road.';if(this.id==='kitchen')detail=`Bridge ${this.bridgeOpen?'OPEN':'CLOSED'} · ${this.lap===1?'coffee spill growing':'coffee has flooded the shortcut'} · toaster launches ${this.launches}`;if(this.id==='giant')detail=this.awake?'AWAKE · the direct route bucks beneath you':`Sleep disturbed ${Math.round(this.wake)}% · E / WAKE for the shortcut`;if(this.id==='opponent')detail=`${this.sectors.filter(s=>s.locked).length} sectors locked · ${this.sectors.reduce((n,s)=>n+s.tune,0)/4>.55?'jumps growing':'corners tightening'}`;return detail;}
 diagnostics(){return{id:this.id,time:this.time,lap:this.lap,next:this.next,passed:this.passed,target:this.target(),result:this.result,choicePending:this.choicePending,trails:this.trails.length,remainingPaper:this.tiles.filter(t=>t.mesh.visible).length,wake:this.wake,awake:this.awake,bridgeOpen:this.bridgeOpen,launches:this.launches,coffeeTime:this.coffeeTime,sectors:this.sectors.map(s=>({...s}))};}
 dispose(){for(const body of this.bodies)if(body.world)this.world.removeBody(body);this.root.traverse(o=>o.geometry?.dispose());for(const m of this.materials.values())m.dispose();this.coffee?.material.dispose();this.root.removeFromParent();if(this.scene){this.scene.background=this.oldBackground;this.scene.fog.color.copy(this.oldFog);}}
}
