import * as THREE from 'three';
import './style.css';
import {GroundDetail} from './ground-detail.js';
import { TireTracks, createTreadTexture } from './tire-tracks.js';
import { createTextures, applyTerrainTexture, createSkyTexture } from './textures.js';
import {track,terrain as raceTerrain,freeTerrain,trackDistance,createState,resetBike,stepBike,TAU} from './world.js';
let mode='race';
const terrain=(x,z)=>mode==='free'?freeTerrain(x,z):raceTerrain(x,z);
const $=id=>document.getElementById(id);
const mobile=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;
if(mobile)document.body.classList.add('touch-device');
const scene=new THREE.Scene();scene.background=new THREE.Color('#a9cbd4');scene.fog=new THREE.Fog('#b9cfcb',170,520);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});}catch(e){$('menu').innerHTML='<h2>WebGL is unavailable</h2><p>Please open this game in a browser with hardware acceleration enabled.</p>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const sky=new THREE.Mesh(new THREE.SphereGeometry(650,32,16),new THREE.MeshBasicMaterial({map:createSkyTexture(),side:THREE.BackSide,depthWrite:false,fog:false}));scene.add(sky);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,1000);
scene.add(new THREE.HemisphereLight('#dceaf2','#66533d',2.0));const sun=new THREE.DirectionalLight('#fff1d8',2.5);sun.position.set(-90,130,70);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:320});sun.shadow.bias=-.0005;scene.add(sun);scene.add(sun.target);
const materials={dirt:new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}),sand:new THREE.MeshStandardMaterial({color:'#b5794c',roughness:1}),rock:new THREE.MeshStandardMaterial({color:'#ac6846',roughness:1,flatShading:true}),dark:new THREE.MeshStandardMaterial({color:'#202b28',roughness:.8}),lime:new THREE.MeshStandardMaterial({color:'#d5f461',roughness:.5}),steel:new THREE.MeshStandardMaterial({color:'#b5c1ba',metalness:.7,roughness:.35}),white:new THREE.MeshStandardMaterial({color:'#eee9d4'}),green:new THREE.MeshStandardMaterial({color:'#727849',roughness:1})};
const textures=createTextures(renderer,mobile);
applyTerrainTexture(materials.dirt,textures);
materials.rock.map=textures.rock;materials.rock.color.set('#ffffff');materials.rock.bumpMap=textures.rock;materials.rock.bumpScale=.22;
materials.green.map=textures.cactus;materials.green.color.set('#ffffff');materials.green.bumpMap=textures.cactus;materials.green.bumpScale=.06;
materials.dark.map=textures.rubber;materials.dark.color.set('#ffffff');
const groundGeo=new THREE.PlaneGeometry(900,900,300,300);groundGeo.rotateX(-Math.PI/2);const pos=groundGeo.attributes.position,colors=[];const c=new THREE.Color();for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,terrain(x,z));const t=Math.atan2(z/78,x/102),p=track(t);const d=Math.hypot(x-p.x,z-p.z);c.set(d<10?'#a66b42':d<12?'#be8a57':'#c49765');c.multiplyScalar(.94+.07*Math.sin(x*3+z*6));colors.push(c.r,c.g,c.b);}groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();const ground=new THREE.Mesh(groundGeo,materials.dirt);ground.receiveShadow=true;scene.add(ground);
const groundDetail=new GroundDetail(scene,(x,z)=>surfaceHeight(x,z));
const tireTracks=new TireTracks(scene,{capacity:mobile?3000:6000,texture:createTreadTexture()});
// Sample the rendered triangles so tread decals sit on the visible ground.
function surfaceHeight(x,z){
  const gx=THREE.MathUtils.clamp((x+450)/3,0,299.9999),gz=THREE.MathUtils.clamp((z+450)/3,0,299.9999);
  const ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz;
  const a=pos.getY(iz*301+ix),b=pos.getY((iz+1)*301+ix),c=pos.getY((iz+1)*301+ix+1),d=pos.getY(iz*301+ix+1);
  return u+v<=1?a+(d-a)*u+(b-a)*v:c+(b-c)*(1-u)+(d-c)*(1-v);
}
function mesh(geo,mat,x,y,z,parent=scene){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
function box(w,h,d,mat,x,y,z,parent){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
let seed=42;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
// Mountain tops retain their intended elevation; foundations cover the entire footprint.
const mountains=[],decorations=[];
function groundMountain(m){
  const {radius,height,basePositions}=m.userData;let lowest=Infinity;
  const extent=radius*Math.max(m.scale.x,m.scale.z);
  for(let x=-extent;x<=extent;x+=3)for(let z=-extent;z<=extent;z+=3){
    if(x*x+z*z<=extent*extent)lowest=Math.min(lowest,terrain(m.position.x+x,m.position.z+z));
  }
  const bottom=lowest-4,top=terrain(m.position.x,m.position.z)+height*.83;
  const attr=m.geometry.attributes.position;
  for(let i=0;i<attr.count;i++){const fraction=(basePositions[i]+height/2)/height;attr.setY(i,THREE.MathUtils.lerp(bottom,top,fraction));}
  attr.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();
  m.userData.foundation=bottom;
}
for(let i=0;i<45;i++){
  const a=rand()*TAU,r=180+rand()*200,x=Math.sin(a)*r,z=Math.cos(a)*r,h=15+rand()*45;
  const topRadius=8+rand()*16,radius=25+rand()*30;
  const geo=new THREE.CylinderGeometry(topRadius,radius,h,10,3),m=mesh(geo,materials.rock,x,0,z);
  m.rotation.y=rand()*TAU;m.scale.z=.6+rand();
  const inset=440-radius*Math.max(1,m.scale.z);m.position.x=THREE.MathUtils.clamp(x,-inset,inset);m.position.z=THREE.MathUtils.clamp(z,-inset,inset);
  m.userData={radius,height:h,basePositions:Array.from({length:geo.attributes.position.count},(_,i)=>geo.attributes.position.getY(i))};
  groundMountain(m);m.receiveShadow=true;mountains.push(m);
}
for(let i=0;i<160;i++){
  const x=(rand()-.5)*480,z=(rand()-.5)*480,y=terrain(x,z);let root;
  if(i%3===0){
    const g=new THREE.Group();g.position.set(x,y-.15,z);scene.add(g);const h=2+rand()*3;
    mesh(new THREE.CylinderGeometry(.24,.34,h,6),materials.green,0,h/2,0,g);
    box(1.5,.35,.35,materials.green,.6,h*.55,0,g);
    mesh(new THREE.CylinderGeometry(.18,.21,h*.4,5),materials.green,1.2,h*.75,0,g);root=g;
  }else{
    root=mesh(new THREE.DodecahedronGeometry(.6+rand()*2,0),materials.rock,x,y-.2,z);root.scale.set(1,.6,1.3);
  }
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  root.userData.groundOffset=root.position.y-y;root.userData.onTrack=trackDistance(x,z)<17;
  root.visible=!root.userData.onTrack;decorations.push(root);
}
const trackObjects=new THREE.Group();scene.add(trackObjects);
// Track boundary stakes and gate arches guide the route.
for(let i=0;i<100;i++){const a=i/100*TAU,p=track(a),n=track(a+.01);const dx=n.x-p.x,dz=n.z-p.z,l=Math.hypot(dx,dz);for(const side of [-1,1]){const x=p.x+dz/l*11*side,z=p.z-dx/l*11*side;box(.16,1.2,.16,materials.white,x,terrain(x,z)+.6,z,trackObjects);}}
const gates=[];for(let i=0;i<12;i++){const a=i/12*TAU,p=track(a),n=track(a+.01),g=new THREE.Group();g.position.set(p.x,terrain(p.x,p.z),p.z);g.rotation.y=Math.atan2(n.x-p.x,n.z-p.z);trackObjects.add(g);const mat=materials.lime.clone();for(const x of [-9,9])box(.3,7,.3,mat,x,3.5,0,g);box(18.3,.6,.4,mat,0,7,0,g);const cv=document.createElement('canvas');cv.width=256;cv.height=64;const ctx=cv.getContext('2d');ctx.fillStyle='#24362c';ctx.fillRect(0,0,256,64);ctx.fillStyle='#e7fb7a';ctx.font='bold 30px Arial';ctx.textAlign='center';ctx.fillText(i===0?'DUST / FINISH':`GATE ${String(i).padStart(2,'0')} →`,128,43);const tx=new THREE.CanvasTexture(cv);const sign=mesh(new THREE.PlaneGeometry(6,1.5),new THREE.MeshBasicMaterial({map:tx,side:THREE.DoubleSide}),0,6.5,0,g);sign.rotation.y=Math.PI;gates.push({group:g,mat,p});}
function makeBike(){
  const bike=new THREE.Group(),body=new THREE.Group();bike.add(body);body.position.y=-.5;
  const wheels=[];
  for(const z of [-1.05,1.1]){
    const wheel=new THREE.Group();scene.add(wheel);wheels.push(wheel);
    const tire=mesh(new THREE.TorusGeometry(.61,.16,10,32),materials.dark,0,0,0,wheel);tire.rotation.y=Math.PI/2;
    const hub=mesh(new THREE.CylinderGeometry(.12,.12,.3,12),materials.steel,0,0,0,wheel);hub.rotation.z=Math.PI/2;
    const rim=mesh(new THREE.TorusGeometry(.43,.035,6,24),materials.steel,0,0,0,wheel);rim.rotation.y=Math.PI/2;
    for(let j=0;j<12;j++){const spoke=box(.03,.87,.025,materials.steel,0,0,0,wheel);spoke.rotation.x=j*Math.PI/6;}
    for(let j=0;j<24;j++){const a=j/24*TAU;const tread=box(.29,.08,.14,materials.dark,0,Math.cos(a)*.745,Math.sin(a)*.745,wheel);tread.rotation.x=a;}
    wheel.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  }
  const frame=box(.43,.42,1.35,materials.lime,0,.83,.05,body);frame.rotation.x=-.12;
  box(.45,.15,.88,materials.dark,0,1.12,-.36,body);box(.3,.52,.58,materials.steel,0,.4,-.05,body);
  box(.5,.12,.85,materials.lime,0,.78,1.02,body);box(.48,.12,.55,materials.lime,0,1.04,-1,body);
  const handlebar=box(1.08,.09,.09,materials.dark,0,1.34,.7,body);
  const rider=new THREE.Group();body.add(rider);
  for(const x of [-.29,.29]){box(.2,.2,.4,materials.white,x,.43,.12,rider);const leg=box(.22,.65,.25,materials.dark,x,.76,-.22,rider);leg.rotation.x=-.6;const arm=box(.16,.65,.18,materials.lime,x,1.46,.33,rider);arm.rotation.x=-.85;}
  const torso=box(.62,.72,.36,materials.lime,0,1.49,-.18,rider);torso.rotation.x=.25;
  mesh(new THREE.SphereGeometry(.34,16,12),materials.white,0,2.07,-.03,rider);box(.49,.19,.18,materials.dark,0,2.09,.26,rider);box(.53,.06,.42,materials.lime,0,2.29,.18,rider);
  body.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(bike);
  const forks=[];for(let i=0;i<4;i++)forks.push(mesh(new THREE.CylinderGeometry(.055,.07,1,8),materials.steel,0,0,0));
  return{bike,body,wheels,rider,handlebar,forks};
}
const {bike,body,wheels,rider,handlebar,forks}=makeBike();
const dustCount=100,dustGeo=new THREE.BufferGeometry(),dustPositions=new Float32Array(dustCount*3);dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#dfbd8c',size:.6,transparent:true,opacity:.45,depthWrite:false}));scene.add(dust);const particles=Array.from({length:dustCount},()=>({life:0,x:0,y:-100,z:0}));let dustIndex=0;
let state=createState(),phase='menu',elapsed=0,lap=1,nextGate=1,score=0,toastTime=0,cameraReady=false,countdown=0;
const input={gas:false,brake:false,left:false,right:false,boost:false,leanForward:false,leanBack:false,steer:undefined,lean:undefined};const keys={KeyW:'gas',ArrowUp:'gas',KeyS:'brake',ArrowDown:'brake',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'boost',KeyI:'leanForward',KeyK:'leanBack'};
let audio,osc,gain,sound=false;function initAudio(){if(audio)return;audio=new AudioContext();osc=audio.createOscillator();gain=audio.createGain();osc.type='sawtooth';const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=500;osc.connect(filter);filter.connect(gain);gain.connect(audio.destination);gain.gain.value=0;osc.start();} $('sound').onclick=()=>{initAudio();audio.resume();sound=!sound;$('sound').textContent=sound?'SOUND ON':'SOUND OFF';};
function clearInput(){for(const k in input)input[k]=false;input.steer=undefined;input.lean=undefined;resetJoystick();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
window.addEventListener('keydown',e=>{if(keys[e.code]){e.preventDefault();input[keys[e.code]]=true;}if(e.repeat)return;if(e.code==='KeyR'&&phase==='playing')recover();if(e.code==='Escape'||e.code==='KeyP')togglePause();});window.addEventListener('keyup',e=>{if(keys[e.code])input[keys[e.code]]=false;});window.addEventListener('blur',()=>{clearInput();if(phase==='playing')togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(phase==='playing')togglePause();}});
let joystickPointer=null;
function resetJoystick(){joystickPointer=null;const knob=$('joystick-knob');if(knob)knob.style.transform='translate(-50%,-50%)';}
const joystick=$('joystick');
function moveJoystick(e){if(e.pointerId!==joystickPointer)return;const r=joystick.getBoundingClientRect(),radius=r.width*.34;let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}input.steer=Math.abs(x)<.08?0:x;input.lean=Math.abs(y)<.08?0:y;$('joystick-knob').style.transform=`translate(calc(-50% + ${x*radius}px),calc(-50% + ${y*radius}px))`;}
joystick.addEventListener('pointerdown',e=>{if(joystickPointer!==null)return;e.preventDefault();joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoystick(e);});
joystick.addEventListener('pointermove',moveJoystick);
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId!==joystickPointer)return;input.steer=undefined;input.lean=undefined;resetJoystick();});
for(const b of document.querySelectorAll('[data-control]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input[b.dataset.control]=true;b.classList.add('pressed');});const up=()=>{input[b.dataset.control]=false;b.classList.remove('pressed');};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);}
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;updateEnvironment();document.querySelectorAll('[data-mode]').forEach(v=>v.classList.toggle('selected',v===b));};
function toast(text,duration=2){$('toast').textContent=text;toastTime=duration;}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;}
function highlight(){gates.forEach((g,i)=>{g.mat.color.set(i===nextGate?'#e4ff69':'#e4d8b2');g.mat.emissive.set(i===nextGate?'#556500':'#000000');});}
function updateEnvironment(){
  tireTracks.clear();
  trackObjects.visible=mode==='race';materials.dirt.map=mode==='free'?textures.freeMacro:textures.macro;
  for(let i=0;i<pos.count;i++)pos.setY(i,terrain(pos.getX(i),pos.getZ(i)));
  pos.needsUpdate=true;groundGeo.computeVertexNormals();groundGeo.computeBoundingSphere();
  mountains.forEach(groundMountain);
  groundDetail.update(state.x,state.z,true);
  decorations.forEach(o=>{o.position.y=terrain(o.position.x,o.position.z)+o.userData.groundOffset;o.visible=mode==='free'||!o.userData.onTrack;});
  document.querySelector('.gate-stat').hidden=mode==='free';
}
function start(){tireTracks.clear();state=createState(mode==='free'?{height:freeTerrain,spawn:{x:0,z:0,yaw:0}}:{});elapsed=0;lap=1;nextGate=1;score=0;countdown=3;phase='playing';cameraReady=false;accumulator=0;clearInput();document.body.classList.add('playing');for(const id of ['menu','location','footer','overlay'])$(id).hidden=true;for(const id of ['hud','pause'])$(id).hidden=false;$('touch').hidden=!mobile;$('lap-label').textContent=mode==='race'?'LAP':'STUNT SCORE';$('resume').hidden=false;highlight();}
$('start').onclick=start;$('restart').onclick=start;$('reset').onclick=()=>{if(phase==='playing')recover();};
function recover(){tireTracks.breakTrail();if(mode==='free'){const radius=Math.hypot(state.x,state.z),scale=radius>380?380/radius:1;resetBike(state,state.x*scale,state.z*scale,state.yaw);cameraReady=false;toast('BACK ON THE DIRT');return;}const a=(nextGate-1+12)%12/12*TAU,p=track(a),q=track(a+.03);resetBike(state,p.x,p.z,Math.atan2(q.x-p.x,q.z-p.z));cameraReady=false;toast('BACK ON THE DIRT');}
function togglePause(){if(phase==='playing'){phase='paused';clearInput();$('overlay').hidden=false;$('overlay-label').textContent='TAKE A BREATHER';$('overlay-title').textContent='Ride paused.';$('overlay-copy').textContent='The desert isn’t going anywhere.';$('resume').hidden=false;}else if(phase==='paused'){phase='playing';$('overlay').hidden=true;}}$('pause').onclick=togglePause;$('resume').onclick=togglePause;
$('home').onclick=()=>{phase='menu';clearInput();document.body.classList.remove('playing');for(const id of ['menu','location','footer'])$(id).hidden=false;for(const id of ['hud','pause','touch','overlay'])$(id).hidden=true;};
function finish(){phase='finished';clearInput();let best;try{best=Number(localStorage.getItem('dust-valley-best'))||Infinity;if(elapsed<best)localStorage.setItem('dust-valley-best',String(elapsed));}catch{}$('overlay').hidden=false;$('overlay-label').textContent='THREE LAPS. ALL DUST.';$('overlay-title').textContent='Nicely ridden.';$('overlay-copy').textContent=`Your time: ${formatTime(elapsed)} · Stunt score: ${score}. ${elapsed<(best||Infinity)?'New personal best!':`Best: ${formatTime(best)}`}`;$('resume').hidden=true;}
const mapCtx=$('map').getContext('2d');function drawMap(){
  const ctx=mapCtx;ctx.clearRect(0,0,180,150);
  if(mode==='free'){
    // A local compass replaces the race route and next-checkpoint marker.
    ctx.strokeStyle='#e5e0ca44';ctx.lineWidth=1;ctx.beginPath();ctx.arc(90,75,54,0,TAU);ctx.stroke();
    ctx.fillStyle='#e7fb7a';ctx.font='11px Arial';ctx.textAlign='center';ctx.fillText('N',90,15);
    ctx.save();ctx.translate(90,75);ctx.rotate(-state.yaw);
  }else{
    const mx=x=>90+x*.58,mz=z=>75+z*.58;ctx.beginPath();
    for(let i=0;i<=100;i++){const p=track(i/100*TAU);i?ctx.lineTo(mx(p.x),mz(p.z)):ctx.moveTo(mx(p.x),mz(p.z));}
    ctx.strokeStyle='#e5e0ca66';ctx.lineWidth=7;ctx.stroke();const p=gates[nextGate].p;
    ctx.fillStyle='#e7fb7a';ctx.beginPath();ctx.arc(mx(p.x),mz(p.z),4,0,TAU);ctx.fill();
    ctx.save();ctx.translate(mx(state.x),mz(state.z));ctx.rotate(-state.yaw);
  }
  ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(-4,-4);ctx.lineTo(4,-4);ctx.closePath();ctx.fill();ctx.restore();
}
const target=new THREE.Vector3(),look=new THREE.Vector3(),chaseAnchor=new THREE.Vector3();let chaseYaw=0;let prev=performance.now(),accumulator=0,total=0;
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-prev)/1000,.06);prev=now;total+=dt;
if(phase==='playing'){if(countdown>0){countdown-=dt;toast(countdown>0?String(Math.ceil(countdown)):'SEND IT',.8);}else{elapsed+=dt;accumulator+=dt;while(accumulator>=1/120){const result=stepBike(state,input,1/120);tireTracks.update(state.crashed?[]:state.wheelContacts,surfaceHeight);if(result.landed>.5){if(result.crashed){toast('WIPEOUT · R OR ↺ TO RECOVER',3);}else{const points=Math.round(result.landed*100);score+=points;toast(`AIR TIME +${points}`);}}accumulator-=1/120;}
if(Math.hypot(state.x,state.z)>400){recover();toast('BACK TO THE BASIN');}
if(mode==='race'){const p=gates[nextGate].p;if(Math.hypot(state.x-p.x,state.z-p.z)<12){if(nextGate===0){lap++;if(lap>3)finish();else toast(`LAP ${lap} / 3`);}else toast(`GATE ${nextGate} / 12`,.8);nextGate=(nextGate+1)%12;highlight();}}
}if(state.crashed)toast('WIPEOUT · R OR ↺ TO RECOVER',1);toastTime-=dt;if(toastTime<=0)$('toast').textContent='';}
if(phase==='menu'){const p=track(.12);state.x=p.x;state.z=p.z;state.y=terrain(p.x,p.z)+.8;state.yaw=-.15;state.pitch=0;camera.position.set(p.x+19+Math.sin(total*.07)*3,p.y||terrain(p.x,p.z)+8,p.z+18);camera.lookAt(p.x-9,2,p.z-10);}
else{
  if(!cameraReady){chaseAnchor.set(state.x,state.y,state.z);chaseYaw=state.yaw;cameraReady=true;}
  look.set(state.x,state.y,state.z);chaseAnchor.lerp(look,1-Math.exp(-dt*10));
  const headingDelta=Math.atan2(Math.sin(state.yaw-chaseYaw),Math.cos(state.yaw-chaseYaw));
  chaseYaw+=headingDelta*(1-Math.exp(-dt*8));
  // Position and look-ahead share one filtered heading, avoiding camera whip on reversal.
  target.set(chaseAnchor.x-Math.sin(chaseYaw)*6.2,chaseAnchor.y+2.7,chaseAnchor.z-Math.cos(chaseYaw)*6.2);
  target.y=Math.max(target.y,surfaceHeight(target.x,target.z)+1.4);
  look.set(chaseAnchor.x+Math.sin(chaseYaw)*6,chaseAnchor.y+1.2,chaseAnchor.z+Math.cos(chaseYaw)*6);
  camera.position.copy(target);camera.lookAt(look);camera.fov+=(70+Math.min(14,state.speed*.42)-camera.fov)*(1-Math.exp(-dt*4));camera.updateProjectionMatrix();
}
if(phase==='menu'){
 bike.position.set(state.x,state.y+.5,state.z);bike.rotation.set(0,state.yaw,0);bike.updateMatrixWorld(true);
 wheels.forEach((w,i)=>{w.position.copy(bike.localToWorld(new THREE.Vector3(0,-.45,i?1.1:-1.05)));w.quaternion.copy(bike.quaternion);});
}else{
 bike.position.set(state.x,state.y+.5,state.z);bike.quaternion.copy(state.quaternion);
 wheels.forEach((w,i)=>{const t=state.wheelTransforms[i];w.position.copy(t.position);w.quaternion.copy(t.quaternion);});
}
handlebar.rotation.y=state.steer;
rider.position.x=Math.sin(state.roll)*.12;
rider.rotation.z=-state.roll*.14;
rider.rotation.x=-Math.abs(state.steer)*.15+(input.lean ?? ((input.leanBack?1:0)-(input.leanForward?1:0)))*-.18;
rider.position.y=-Math.min(.12,Math.max(...state.compression)*.15);
bike.updateMatrixWorld(true);
forks.forEach((fork,i)=>{const front=i>=2,side=i%2?1:-1;const start=bike.localToWorld(new THREE.Vector3(side*.23,front?.68:.1,front?.7:-.05));const end=wheels[front?1:0].position.clone().add(new THREE.Vector3(side*.23,0,0).applyQuaternion(bike.quaternion));fork.position.copy(start).add(end).multiplyScalar(.5);fork.scale.y=start.distanceTo(end);fork.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());});
sun.position.set(state.x-60,state.y+100,state.z+50);sun.target.position.set(state.x,state.y,state.z);
if(phase==='playing'&&state.speed>5&&!state.air&&countdown<=0){for(let i=0;i<2;i++){const p=particles[dustIndex++%dustCount];Object.assign(p,{life:1,x:state.x+(Math.random()-.5),y:state.y-.5,z:state.z-Math.cos(state.yaw)});}}particles.forEach((p,i)=>{p.life-=dt*.7;if(p.life>0){p.y+=dt*.6;p.x+=dt*.5;}dustPositions[i*3]=p.x;dustPositions[i*3+1]=p.life>0?p.y:-100;dustPositions[i*3+2]=p.z;});dustGeo.attributes.position.needsUpdate=true;
if(audio){osc.frequency.setTargetAtTime(45+state.speed*4+(input.gas?20:0),audio.currentTime,.08);gain.gain.setTargetAtTime(sound&&phase==='playing'?.025:0,audio.currentTime,.1);}
$('speed').textContent=Math.round(state.speed*3.6);$('time').textContent=formatTime(elapsed);$('lap').innerHTML=mode==='race'?`${String(Math.min(lap,3)).padStart(2,'0')}<span>/03</span>`:String(score);$('gate').innerHTML=`${String(nextGate===0?12:nextGate).padStart(2,'0')}<span>/12</span>`;$('boost').style.width=state.boost+'%';groundDetail.update(state.x,state.z);sky.position.copy(camera.position);drawMap();gates.forEach(g=>{g.group.visible=phase==='menu'||g.group.position.distanceTo(camera.position)>13;});renderer.render(scene,camera);}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();requestAnimationFrame(animate);
// Read-only diagnostics for smoke tests and performance inspection.
window.__game={environment:()=>({trackVisible:trackObjects.visible,trackTexture:materials.dirt.map===textures.macro,height:state.physics.height(state.x,state.z),visualHeight:terrain(state.x,state.z),mountains:mountains.map(m=>({x:m.position.x,z:m.position.z,radius:m.userData.radius*Math.max(m.scale.x,m.scale.z),foundation:m.userData.foundation}))}),snapshot:()=>({phase,mode,elapsed,lap,nextGate,score,countdown,tireTrackSegments:tireTracks.count,...state}),renderer};
