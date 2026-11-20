import {terrainMaps,terrainMap,paintTerrainMap} from './terrain-maps.js';
import {loadMcmParticleAssets} from './mcm-particle-assets.js';
import {VoxelTerrain} from './voxel-terrain.js';
import {ArtStyleRenderer,artStyles} from './art-styles.js';
import {McmParticles} from './mcm-particles.js';
import {matchSkyHorizon,skyUniforms} from './sky-haze.js';
import * as THREE from 'three';
import './style.css';
import {terrainIndices,sampleGrid} from './height-grid.js';
import {createMcmTerrainTextures,createMcmTerrainMaterial} from './mcm-terrain-material.js';
import {createCustomMcmTerrain,createMcmTerrainStub} from './mcm-custom-terrain.js';
import {loadMcmOriginalModels,createMcmOriginalModels} from './mcm-original-models.js';
import {RidePose} from './ride-pose.js';
import {batchMeshes} from './mesh-batch.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GroundDetail} from './ground-detail.js';
import { TireTracks, createTreadTexture } from './tire-tracks.js';
import { createTextures, applyTerrainTexture, createSkyTexture, createDustTexture, soilUniforms } from './textures.js';
import {SandFx} from './sand-fx.js';
import {HorizonTerrain} from './horizon-terrain.js';
import {CSMShadowNode} from 'three/addons/csm/CSMShadowNode.js';
import {fog as fogNode,densityFogFactor,uniform as tslUniform} from 'three/tsl';
import {createSizedPoints} from './sized-points.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {SandSurface} from './sand-surface.js';
import {RideAudio} from './audio.js';
const TAU=Math.PI*2;
let activeSand=null,corePreview=null,coreScene=null;
let previewHeight=null,wild=null,farTerrainMesh=null,viewLow=false;
let starting=false;
const mode='free';
// The one mode: recovered Motocross Madness bike on Dust Valley's dunes.
const terrain=(x,z)=>activeSand?activeSand.height(x,z):(previewHeight?previewHeight(x,z):(wild?wild.height(x,z):0));
// Scenery clears the riding area around the start instead of a race lane.
const startX=()=>wild?.spawn.x??0,startZ=()=>wild?.spawn.z??0;
const trackDistance=(x,z)=>Math.hypot(x-startX(),z-startZ());
const spawnRing=t=>({x:startX()+Math.sin(t)*150,z:startZ()+Math.cos(t)*150,tx:Math.cos(t),tz:-Math.sin(t)});
const freeClear=(x,z)=>wild?wild.clear(x,z):false;
const $=id=>document.getElementById(id);
let originalModels,opponentModels;
// The game ships one mode: the recovered bike on a generated Sidewinder Dunes.
function customMcmScene(base){
 const stub=createMcmTerrainStub(),map=terrainMap('dunes');
 return {...base,mapId:'custom-sidewinder',terrainMode:0,shadowTarget:null,sceneSettings:null,rendering:null,terrain:stub,
  terrainFactory:({initial,nativeToWorld})=>createCustomMcmTerrain({heightAtWorld:(x,z)=>map.height(x,z),nativeToWorld,initial,cells:1024,worldToGrid:stub.worldToGrid})};
}
function syncSandOption(){$('sand-option').hidden=false;$('sand-mode').disabled=false;}
$('mcm-assets').hidden=false;
$('physics-note').textContent='Recovered bike, rider, suspension and engine on Sidewinder Dunes, with Dust Valley sand and scenery.';

const speedCanvas=$('speedlines'),speedCtx=speedCanvas?speedCanvas.getContext('2d'):null;
const mobile=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;
// Debug switches for bisecting GPU load: ?grid=360&shadowpass=0&clouds=0
const debugParams=new URLSearchParams(location.search);
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const readSetting=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const writeSetting=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const settings={art:readSetting('dust-valley-art','original'),camera:readSetting('dust-valley-camera','near'),quality:readSetting('dust-valley-quality','auto'),time:readSetting('dust-valley-time','dawn'),sensitivity:Number(readSetting('dust-valley-sensitivity','1'))||1};
if(mobile)document.body.classList.add('touch-device');
const scene=new THREE.Scene();scene.background=new THREE.Color('#c9b08c');scene.fog=new THREE.Fog('#d8c0a0',180,540);
let renderer;
// WebGPU first; three falls back to its WebGL2 backend where WebGPU is missing.
try{renderer=new THREE.WebGPURenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});await renderer.init();}catch(e){$('menu').innerHTML='<h2>3D graphics are unavailable</h2><p>Please open this game in a browser with WebGPU or WebGL 2 and hardware acceleration enabled.</p>';throw e;}
const rendererBackend=renderer.backend?.isWebGPUBackend?'webgpu':'webgl2';
// Cache built assets across visits (production builds only; dev keeps HMR).
if(import.meta.env.PROD&&'serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const artRenderer=new ArtStyleRenderer(renderer);artRenderer.setStyle(settings.art);settings.art=artRenderer.style;
for(const [id,title]of artStyles){const option=document.createElement('option');option.value=id;option.textContent=title;$('art-style').append(option);}
const sky=new THREE.Mesh(new THREE.SphereGeometry(650,32,16),new THREE.MeshBasicNodeMaterial({map:createSkyTexture(),side:THREE.BackSide,depthWrite:false,fog:false}));scene.add(sky);
const environmentGenerator=new THREE.PMREMGenerator(renderer);
let environmentTarget;
const environmentScene=new THREE.Scene();
const environmentSky=sky.clone();environmentSky.material=sky.material.clone();environmentScene.add(environmentSky);
matchSkyHorizon(sky.material,scene.fog.color);matchSkyHorizon(environmentSky.material,scene.fog.color);
// The sun sits at sunOffset from the bike; wild maps choose its elevation.
const sunOffset=new THREE.Vector3(-110,62,48),sunDir=sunOffset.clone().normalize(),glowTexture=createDustTexture();
const sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:'#ffcf8a',transparent:true,opacity:.34,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));sunGlow.scale.set(170,170,1);scene.add(sunGlow);
const sunCore=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:'#fff0c8',transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));sunCore.scale.set(42,42,1);scene.add(sunCore);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,1000);
const hemi=new THREE.HemisphereLight('#d7e7f0','#7a5638',1.35);scene.add(hemi);const sun=new THREE.DirectionalLight('#ffd6a3',2.35);sun.position.set(-110,62,48);sun.castShadow=true;sun.shadow.radius=2;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:320});sun.shadow.bias=-.00012;sun.shadow.normalBias=.035;scene.add(sun);scene.add(sun.target);
const timePresets={
 dawn:{sun:'#ffd6a3',sunI:2.35,hemiSky:'#d7e7f0',hemiGround:'#7a5638',hemiI:1.35,fog:'#d8c0a0',exposure:1.08,sky:'#ffffff',glow:'#ffcf8a'},
 day:{sun:'#fff4dc',sunI:2.8,hemiSky:'#e5f1f7',hemiGround:'#8b6946',hemiI:1.5,fog:'#cfd6c3',exposure:1.15,sky:'#ffffff',glow:'#fff3cf'},
 dusk:{sun:'#ff9a63',sunI:1.8,hemiSky:'#9aa8c0',hemiGround:'#5c4030',hemiI:.9,fog:'#b88f76',exposure:.95,sky:'#e0a082',glow:'#ff8f5a'}
};
let originalFogColor=null;
// Wild maps bring their own low-sun light and clear sky; elsewhere the time presets apply.
const activeLight=()=>wild&&!previewHeight?wild.view.light:null;
function applyTime(value=settings.time){
 const light=activeLight(),p=light?{sky:'#ffffff',...light}:timePresets[value]||timePresets.dawn;
 const azimuth=Math.atan2(48,-110),reach=120,elevation=(light?.elevation??27.3)*Math.PI/180;
 sunOffset.set(Math.cos(azimuth)*reach,Math.tan(elevation)*reach,Math.sin(azimuth)*reach);sunDir.copy(sunOffset).normalize();
 skyUniforms.mode.value=light?1:0;skyUniforms.sunDir.value.copy(sunDir);skyUniforms.clouds.value=debugParams.get('clouds')==='0'?0:light?.clouds??0;
 if(light){skyUniforms.zenith.value.set(light.zenith);skyUniforms.horizon.value.set(light.horizon);}
 sun.color.set(p.sun);sun.intensity=p.sunI;hemi.color.set(p.hemiSky);hemi.groundColor.set(p.hemiGround);hemi.intensity=p.hemiI*.65;
 scene.fog.color.set(originalFogColor??p.fog);renderer.toneMappingExposure=p.exposure;sky.material.color.set(p.sky);sunGlow.material.color.set(p.glow);sunCore.material.color.set(p.glow);
 environmentSky.material.color.set(p.sky);const old=environmentTarget;environmentTarget=environmentGenerator.fromScene(environmentScene,.04,.1,1000);scene.environment=environmentTarget.texture;scene.environmentIntensity=light?.env??.45;if(old)old.dispose();
}
applyTime();
// Cascaded sun shadows: three cascades to 720 m on desktop (two to 260 m on
// mobile/Low). Terrain casts into them, so dunes shadow dunes at shadow-map
// resolution; the heightfield march only fills in beyond the last cascade.
let cascades=null;
function configureCascades(low,mapSize){
 const count=low||mobile?2:3,maxFar=low||mobile?260:720;
 if(cascades&&cascades.cascades===count&&cascades.maxFar===maxFar&&sun.shadow.mapSize.x===mapSize)return;
 cascades?.dispose();
 sun.shadow.mapSize.set(mapSize,mapSize);sun.shadow.camera.near=1;sun.shadow.camera.far=maxFar*2.6+200;sun.shadow.camera.updateProjectionMatrix();
 // A grazing sun on smooth sand needs normal bias to avoid acne.
 sun.shadow.bias=-.0003;sun.shadow.normalBias=.35;
 cascades=new CSMShadowNode(sun,{cascades:count,maxFar,mode:'practical',lightMargin:200});cascades.fade=true;sun.shadow.shadowNode=cascades;
 soilUniforms.cascadeFar.value=maxFar;
}
function applyQuality(value=settings.quality){
 const low=value==='low',high=value==='high';
 // Retina at 2× made post-processing cost ~7 ms; 1.25–1.5× keeps it sharp.
 const cap=low?1:high?1.35:(mobile?1.25:1.25);
 renderer.setPixelRatio(Math.min(devicePixelRatio,cap));
 const shadow=low?1024:(mobile?1024:2048);configureCascades(low,shadow);
 viewLow=low;syncView();
 if(typeof artRenderer!=='undefined')artRenderer.useCinematic=!low&&!mobile&&debugParams.get('post')!=='0';
 if(typeof boulderMesh!=='undefined')boulderMesh.count=low?220:520;
 if(typeof grassMesh!=='undefined')grassMesh.count=low?Math.min(420,grassData.length):grassData.length;
 if(typeof dust!=='undefined')dust.visible=!low;
}
const materials={dirt:new THREE.MeshStandardNodeMaterial({roughness:1}),sand:new THREE.MeshStandardMaterial({color:'#b5794c',roughness:1}),rock:new THREE.MeshStandardMaterial({color:'#ac6846',roughness:1,flatShading:true}),dark:new THREE.MeshStandardMaterial({color:'#202b28',roughness:.8}),lime:new THREE.MeshStandardMaterial({color:'#d5f461',roughness:.3}),steel:new THREE.MeshStandardMaterial({color:'#b5c1ba',metalness:.7,roughness:.35}),white:new THREE.MeshStandardMaterial({color:'#eee9d4'}),green:new THREE.MeshStandardMaterial({color:'#727849',roughness:1})};
const textures=createTextures(renderer,mobile);
applyTerrainTexture(materials.dirt,textures,{trackStrength:1});
// Wild terrains extend to a shadowed horizon grid beyond the 900 m terrain
// square, so the dune sea reaches kilometres out (see horizon-terrain.js).
const farTerrainCache=new Map();
function farTerrainFor(map){
 if(!farTerrainCache.has(map.id)){const horizon=new HorizonTerrain(renderer,map,{size:mobile?256:512});scene.add(horizon.mesh);farTerrainCache.set(map.id,horizon);}
 const horizon=farTerrainCache.get(map.id);horizon.shade(sunDir);return horizon.mesh;
}
// Exponential-squared haze for wild maps (aerial perspective); linear fog elsewhere.
const hazeDensity=tslUniform(.0004),hazeFog=fogNode(tslUniform(scene.fog.color),densityFogFactor(hazeDensity));
// Fog, draw distance, wind ripples and glints follow the active wild map.
function syncView(){
 const v=wild&&!previewHeight?wild.view:null,low=viewLow;
 scene.fog.near=v?v.fog[0]*(low?.7:1):180;scene.fog.far=v?v.fog[1]*(low?.6:1):(low?400:540);
 camera.far=v?v.far*(low?.65:1):1000;camera.updateProjectionMatrix();
 if(activeLight()!==syncView.light){syncView.light=activeLight();applyTime();}
 soilUniforms.rippleStrength.value=v?v.ripple:0;soilUniforms.sparkle.value=v?v.sparkle:0;soilUniforms.windDir.value.set(v?v.wind.x:1,v?v.wind.z:0).normalize();
 if(farTerrainMesh)farTerrainMesh.visible=false;farTerrainMesh=v?farTerrainFor(wild):null;if(farTerrainMesh)farTerrainMesh.visible=true;
 const haze=v?.haze??null;if(haze)hazeDensity.value=haze*(low?1.6:1);if((scene.fogNode===hazeFog)!==!!haze)scene.fogNode=haze?hazeFog:null;
}
materials.rock.map=textures.rock;materials.rock.color.set('#ffffff');materials.rock.normalMap=textures.rockRelief.normal;materials.rock.normalScale.set(.85,.85);materials.rock.roughnessMap=textures.rockRelief.roughness;
materials.green.map=textures.cactus;materials.green.color.set('#ffffff');materials.green.bumpMap=textures.cactus;materials.green.bumpScale=.06;
materials.dark.map=textures.rubber;materials.dark.color.set('#ffffff');
// 1.25 m ground grid on desktop so GPU-field dune crests stay sharp (2.5 m on mobile).
// 2.5 m coarse ground: the 25 cm GPU sand mesh carries all near detail.
const GROUND_SEGMENTS=+debugParams.get('grid')||360,GROUND_SPACING=900/GROUND_SEGMENTS;
const groundGeo=new THREE.PlaneGeometry(900,900,GROUND_SEGMENTS,GROUND_SEGMENTS);groundGeo.rotateX(-Math.PI/2);groundGeo.setIndex(terrainIndices(GROUND_SEGMENTS));const pos=groundGeo.attributes.position,colors=[];const c=new THREE.Color();for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,terrain(x,z));const d=trackDistance(x,z);c.set(d<10?'#a66b42':d<12?'#be8a57':'#c49765');c.multiplyScalar(.94+.07*Math.sin(x*3+z*6));colors.push(c.r,c.g,c.b);}groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();const ground=new THREE.Mesh(groundGeo,materials.dirt);ground.receiveShadow=true;ground.castShadow=true;scene.add(ground);
const sandSurface=new SandSurface(scene,textures,materials.dirt,{coarseHeight:(x,z)=>sampleGrid(i=>pos.getY(i),x,z,GROUND_SEGMENTS,GROUND_SPACING)});
const classicSandMaterial=sandSurface.material;let originalTerrainTextures,originalTerrainMaterials=[];
function updateOriginalTerrainMaterials(){
 originalTerrainMaterials.forEach(m=>m.dispose());originalTerrainMaterials=[];originalTerrainTextures?.dispose();originalTerrainTextures=null;
 ground.material=materials.dirt;sandSurface.material=classicSandMaterial;
 if(state.physicsBackend==='recovered-core'&&state.physics.scene.rendering){
  originalTerrainTextures=createMcmTerrainTextures(state.physics.scene);
  ground.material=createMcmTerrainMaterial(originalTerrainTextures,state,{bounds:materials.dirt.userData.sandBounds});
  sandSurface.material=createMcmTerrainMaterial(originalTerrainTextures,state,{dense:true});
  originalTerrainMaterials=[ground.material,sandSurface.material];
 }
 for(const mesh of sandSurface.meshes.values())mesh.material=sandSurface.material;
}
const groundDetail=new GroundDetail(scene,(x,z)=>surfaceHeight(x,z));
const tireTracks=new TireTracks(scene,{capacity:mobile?3000:6000,texture:createTreadTexture()});
// Sample the rendered triangles so tread decals sit on the visible ground.
function surfaceHeight(x,z){if(activeSand)return activeSand.height(x,z);if(previewHeight)return previewHeight(x,z);return sampleGrid(i=>pos.getY(i),x,z,GROUND_SEGMENTS,GROUND_SPACING);}

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
  const a=rand()*TAU,r=270+rand()*120,x=Math.sin(a)*r,z=Math.cos(a)*r;
  const radius=26+rand()*30,topRadius=radius*(.46+rand()*.2),height=18+rand()*46;
  // A stepped lathe profile gives each butte a talus apron, cliff bands and a cap.
  const profile=[[radius*1.08,0],[radius*1.01,.07*height],[radius*.9,.15*height],[radius*.86,.18*height],[radius*.79,.4*height],[radius*.73,.44*height],[radius*.7,.72*height],[radius*.62,.76*height],[topRadius*.98,.96*height],[topRadius,height],[0,height]].map(([r,y])=>new THREE.Vector2(r,y));
  const geo=new THREE.LatheGeometry(profile,14),attr=geo.attributes.position,jitter=rand()*TAU;
  geo.translate(0,-height/2,0);
  // Irregular cliff faces keep the buttes from reading as identical cones.
  for(let v=0;v<attr.count;v++){
    const vx=attr.getX(v),vz=attr.getZ(v),rad=Math.hypot(vx,vz);
    if(rad>.01){const ang=Math.atan2(vz,vx),k=1+.06*Math.sin(ang*3+jitter)+.03*Math.sin(ang*7+jitter*2);attr.setX(v,vx*k);attr.setZ(v,vz*k);}
  }
  geo.computeVertexNormals();
  const m=mesh(geo,materials.rock,x,0,z);
  m.rotation.y=rand()*TAU;m.scale.z=.7+rand()*.6;
  const inset=440-radius*Math.max(1,m.scale.z);m.position.x=THREE.MathUtils.clamp(x,-inset,inset);m.position.z=THREE.MathUtils.clamp(z,-inset,inset);
  m.userData={radius,height,basePositions:Array.from({length:geo.attributes.position.count},(_,i)=>geo.attributes.position.getY(i))};
  groundMountain(m);m.receiveShadow=true;m.castShadow=true;mountains.push(m);
}
let mountainBatches=[];
function rebuildMountainBatches(){
  for(const batch of mountainBatches){scene.remove(batch);batch.geometry.dispose();}
  mountains.forEach(m=>m.visible=false);
  mountainBatches=batchMeshes(mountains,scene);
  for(const batch of mountainBatches){batch.castShadow=true;batch.receiveShadow=true;}
}
rebuildMountainBatches();
for(let i=0;i<380;i++){
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
for(const root of decorations)root.removeFromParent();
let decorationBatches=[];
function rebuildDecorationBatches(){
  for(const m of decorationBatches){scene.remove(m);m.geometry.dispose();}
  decorationBatches=batchMeshes(decorations.filter(o=>o.visible),scene);
}
rebuildDecorationBatches();
// Boulders, scree and occasional hoodoos: one instanced mesh, rebuilt per terrain mode.
const boulderData=[];
for(let i=0;i<520;i++){
 let x=0,z=0,tries=0;
 do{x=(rand()-.5)*700;z=(rand()-.5)*700;tries++;}while((trackDistance(x,z)<22||Math.hypot(x,z)<38||Math.hypot(x,z-170)<45)&&tries<40);
 const size=.35+Math.pow(rand(),3)*2.8,spire=i%23===0;
 boulderData.push({x,z,size,spire,rotx:rand()*.5,roty:rand()*TAU,rotz:rand()*.4,shade:.85+rand()*.3});
}
const boulderMesh=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),materials.rock,boulderData.length);
boulderMesh.castShadow=true;boulderMesh.receiveShadow=true;scene.add(boulderMesh);
const boulderMatrix=new THREE.Matrix4(),boulderQuat=new THREE.Quaternion(),boulderEuler=new THREE.Euler(),boulderPos=new THREE.Vector3(),boulderScale=new THREE.Vector3();
function placeBoulders(){
 for(let i=0;i<boulderData.length;i++){
  const b=boulderData[i],hidden=(mode==='free'&&freeClear(b.x,b.z))||(mode!=='free'&&trackDistance(b.x,b.z)<18);
  const s0=hidden?0:b.size;
  boulderPos.set(b.x,terrain(b.x,b.z)-b.size*.22,b.z);
  boulderQuat.setFromEuler(boulderEuler.set(b.rotx,b.roty,b.rotz));
  boulderScale.set(s0,s0*(b.spire?3.2:1),s0*.8);
  boulderMesh.setMatrixAt(i,boulderMatrix.compose(boulderPos,boulderQuat,boulderScale));
 }
 boulderMesh.instanceMatrix.needsUpdate=true;boulderMesh.computeBoundingSphere();
}
placeBoulders();
// Six hero boulders ring the start area; the rest of the scenery is instanced.
const heroRocks=[0,1,2,3,4,5].map(i=>({s:i/6,side:i%2?46:-52,r:2.6+i*.35}));
const heroGroup=new THREE.Group(),heroGeo=new THREE.DodecahedronGeometry(1,1);
const heroPlacement=rock=>{const p=spawnRing(rock.s*TAU);return{x:p.x+p.tz*rock.side,z:p.z-p.tx*rock.side};};
const heroMeshes=heroRocks.map((rock,i)=>{
 const {x,z}=heroPlacement(rock),m=new THREE.Mesh(heroGeo,materials.rock);
 m.position.set(x,terrain(x,z)+rock.r*.35,z);m.scale.set(rock.r*.8,rock.r*.72,rock.r);m.rotation.set(i*.7,i*2.1,i*.3);m.castShadow=true;m.receiveShadow=true;heroGroup.add(m);return m;
});
scene.add(heroGroup);
// A single large stone arch acts as a landmark away from the start.
const archP=spawnRing(.44*TAU),archX=archP.x+archP.tz*-72,archZ=archP.z-archP.tx*-72;
const arch=new THREE.Mesh(new THREE.TorusGeometry(13,2.3,8,28,Math.PI),materials.rock);
arch.position.set(archX,terrain(archX,archZ),archZ);arch.rotation.y=Math.atan2(archP.tx,archP.tz)+.35;arch.castShadow=true;arch.receiveShadow=true;scene.add(arch);
// Dry grass tufts break up the sand at riding distance; one instanced plane draw.
function makeGrassTexture(){
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.clearRect(0,0,64,64);
 for(let i=0;i<11;i++){const x=8+Math.random()*48,b=22+Math.random()*30;g.strokeStyle=i%3===0?'#8a8a52':'#b09b61';g.lineWidth=1.2;g.beginPath();g.moveTo(x,64);g.quadraticCurveTo(x+(Math.random()-.5)*10,42,x+(Math.random()-.5)*18,64-b);g.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const grassData=[];
for(let i=0;i<1500;i++){
 const x=(rand()-.5)*720,z=(rand()-.5)*720;
 if(trackDistance(x,z)<9.5)continue;
 grassData.push({x,z,size:.55+rand()*1.35,rot:rand()*TAU});
}
const bladeA=new THREE.PlaneGeometry(1,1),bladeB=bladeA.clone().rotateY(Math.PI/2);
const grassMesh=new THREE.InstancedMesh(mergeGeometries([bladeA,bladeB]),new THREE.MeshStandardMaterial({map:makeGrassTexture(),alphaTest:.3,side:THREE.DoubleSide,roughness:1}),grassData.length);
grassMesh.count=settings.quality==='low'?Math.min(420,grassData.length):grassData.length;grassMesh.frustumCulled=false;scene.add(grassMesh);
const grassMatrix=new THREE.Matrix4(),grassQuat=new THREE.Quaternion(),grassEuler=new THREE.Euler(),grassPos=new THREE.Vector3(),grassScale=new THREE.Vector3();
function placeGrass(){
 for(let i=0;i<grassData.length;i++){
  const b=grassData[i],hidden=(mode==='free'&&freeClear(b.x,b.z));
  const s=b.size;grassPos.set(b.x,terrain(b.x,b.z)+s*.42,b.z);grassQuat.setFromEuler(grassEuler.set((Math.random()-.5)*.16,b.rot,(Math.random()-.5)*.12));
  grassScale.set(s,s,1);grassMesh.setMatrixAt(i,grassMatrix.compose(grassPos,grassQuat,grassScale));
 }
 grassMesh.instanceMatrix.needsUpdate=true;grassMesh.computeBoundingSphere();
}
placeGrass();



const frontUp=new THREE.Vector3(),frontForward=new THREE.Vector3(),frontRotation=new THREE.Quaternion();
// Contact patches anchor the wheels visually even when suspension and terrain disagree by millimetres.
const shadowMat=new THREE.MeshBasicMaterial({color:0x2e2015,map:glowTexture,transparent:true,opacity:.2,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const wheelShadows=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.CircleGeometry(1,20),shadowMat);m.rotation.x=-Math.PI/2;m.renderOrder=2;m.visible=false;scene.add(m);return m;});
const dustCount=180,dustPoints=createSizedPoints({count:dustCount,map:createDustTexture(),color:'#f5dcb2',size:1.6,opacity:.46}),dustPositions=dustPoints.positions,dust=dustPoints.object;scene.add(dust);
const sandFx=new SandFx(scene,{mobile,dustTexture:createDustTexture()});
const recoveredParticles=new McmParticles();scene.add(recoveredParticles.root);
const voxelTerrain=new VoxelTerrain();scene.add(voxelTerrain.root);
function renderArt(){
 flushTrackMap();
 // The fine sand mesh replaces the coarse ground inside its window (minus a blend margin).
 if(fineMesh?.mesh.visible&&fineSand){const o=fineSand.origin.value,c=.25,m=7;materials.dirt.userData.sandBounds.value.set(o.x*c+m,(o.x+fineSand.n)*c-m,o.y*c+m,(o.y+fineSand.n)*c-m);}
 voxelTerrain.root.visible=artRenderer.style==='voxel'&&phase!=='menu';
 const hidden=[];

 if(voxelTerrain.root.visible){voxelTerrain.update(state.x,state.z,surfaceHeight);for(const mesh of [ground,...sandSurface.meshes.values()])if(mesh.visible){hidden.push(mesh);mesh.visible=false;}}
 try{artRenderer.render(scene,camera);}finally{hidden.forEach(mesh=>mesh.visible=true);}
}
applyQuality();
// Warm dust motes drifting around the camera add close-range atmosphere.
const moteCount=110,motePoints=createSizedPoints({count:moteCount,map:createDustTexture(),color:'#f4dfc2',size:.11,opacity:.22}),motePos=motePoints.positions,moteBase=Array.from({length:moteCount},()=>({x:(Math.random()-.5)*36,y:Math.random()*9,z:(Math.random()-.5)*36,phase:Math.random()*6.28})),motes=motePoints.object;scene.add(motes);

const particles=Array.from({length:dustCount},()=>({life:0,x:0,y:-100,z:0,vx:0,vy:0,vz:0}));let dustIndex=0;
// Soft plumes read against the sand and sell rear-wheel roost at speed.
function puff(x,y,z,count=1,spread=.5,power=1){
 for(let i=0;i<count;i++){
  const p=particles[dustIndex++%dustCount],a=Math.random()*TAU,r=Math.random()*spread;
  Object.assign(p,{life:.7+Math.random()*.5,x:x+Math.cos(a)*r,y:y+Math.random()*.35,z:z+Math.sin(a)*r,vx:Math.cos(a)*(.3+Math.random()*.8)*power,vy:.25+Math.random()*.55,vz:Math.sin(a)*(.3+Math.random()*.8)*power});
 }
}

// The menu renders the dunes before a bike exists; the real state replaces this.
const menuState={x:0,y:0,z:0,yaw:0,pitch:0,roll:0,speed:0,vy:0,gear:1,rpm:0,boost:0,steer:0,throttle:0,air:false,airtime:0,contacts:0,crashed:false,wheelContacts:[],wheelTransforms:[-1.05,1.1].map(z=>({position:{x:0,y:-.45,z},quaternion:{x:0,y:0,z:0,w:1},direction:{x:0,y:-1,z:0}})),compression:[0,0],slipRatio:[0,0],visualWheelRadii:[.61,.61],quaternion:{x:0,y:0,z:0,w:1},physicsBackend:'menu'};
let state=menuState,phase='menu',elapsed=0,toastTime=0,cameraReady=false,shake=0,crashTimer=0;let bestLap=Infinity;try{bestLap=Number(localStorage.getItem('dust-valley-best-lap'))||Infinity;}catch{}
let perfTime=0,perfFrames=0,autoDowngraded=false,impactFlash=0;
const ridePose=new RidePose(state);
const input={gas:false,brake:false,left:false,right:false,boost:false,leanForward:false,leanBack:false,steer:undefined,lean:undefined};const keys={KeyW:'gas',ArrowUp:'gas',KeyS:'brake',ArrowDown:'brake',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'boost',KeyI:'leanForward',KeyK:'leanBack'};
const rideAudio=new RideAudio();rideAudio.onError=()=>toast('Original audio unavailable. Toggle sound to retry.',3);let sound=false,lastCountdownBeep=4;$('sound').setAttribute('aria-pressed','false');$('sound').onclick=()=>{rideAudio.init();rideAudio.resume();sound=!sound;rideAudio.setEnabled(sound);$('sound').textContent=sound?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',String(sound));};
let padPause=false,padSeen=false;
function pollGamepad(){
 const pad=[...(navigator.getGamepads?.()||[])].find(Boolean);if(!pad)return;
 const any=pad.buttons.some(b=>b.pressed)||pad.axes.some(a=>Math.abs(a)>.15);
 if(any)padSeen=true;if(!padSeen)return;
 const steer=pad.axes[0]??0,lean=pad.axes[1]??0;
 input.steer=Math.abs(steer)>.12?Math.max(-1,Math.min(1,steer*settings.sensitivity)):0;input.lean=Math.abs(lean)>.15?lean:0;
 input.gas=!!(pad.buttons[7]?.pressed||pad.buttons[0]?.pressed);
 input.brake=!!(pad.buttons[6]?.pressed||pad.buttons[1]?.pressed);
 input.boost=!!(pad.buttons[5]?.pressed||pad.buttons[2]?.pressed);
 const pause=!!pad.buttons[9]?.pressed;if(pause&&!padPause)togglePause();padPause=pause;
}
function clearInput(){for(const k in input)input[k]=false;input.steer=undefined;input.lean=undefined;resetJoystick();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
window.addEventListener('keydown',e=>{if(keys[e.code]){e.preventDefault();input[keys[e.code]]=true;}if(e.repeat)return;if(e.code==='KeyR'&&phase==='playing')recover();if(e.code==='KeyC'&&phase!=='menu'){const order=['near','far','helmet'];settings.camera=order[(order.indexOf(settings.camera)+1)%order.length];writeSetting('dust-valley-camera',settings.camera);cameraReady=false;syncSettingsUI();toast('CAMERA · '+settings.camera.toUpperCase(),1);}if(e.code==='Escape'||e.code==='KeyP'){if(phase==='photo')exitPhoto();else togglePause();}});window.addEventListener('keyup',e=>{if(keys[e.code])input[keys[e.code]]=false;});window.addEventListener('blur',()=>{clearInput();if(phase==='playing')togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(phase==='playing')togglePause();}});
let joystickPointer=null;
function resetJoystick(){joystickPointer=null;const knob=$('joystick-knob');if(knob)knob.style.transform='translate(-50%,-50%)';}
const joystick=$('joystick');
function moveJoystick(e){if(e.pointerId!==joystickPointer)return;const r=joystick.getBoundingClientRect(),radius=r.width*.34;let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}input.steer=Math.abs(x)<.08?0:Math.max(-1,Math.min(1,x*settings.sensitivity));input.lean=Math.abs(y)<.08?0:y;$('joystick-knob').style.transform=`translate(calc(-50% + ${x*radius}px),calc(-50% + ${y*radius}px))`;}
joystick.addEventListener('pointerdown',e=>{if(joystickPointer!==null)return;e.preventDefault();joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoystick(e);});
joystick.addEventListener('pointermove',moveJoystick);
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId!==joystickPointer)return;input.steer=undefined;input.lean=undefined;resetJoystick();});
for(const b of document.querySelectorAll('[data-control]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input[b.dataset.control]=true;b.classList.add('pressed');});const up=()=>{input[b.dataset.control]=false;b.classList.remove('pressed');};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);}
let settingsWasPlaying=false;
function syncSettingsUI(){
 for(const b of document.querySelectorAll('[data-camera]'))b.classList.toggle('selected',b.dataset.camera===settings.camera);
 for(const b of document.querySelectorAll('[data-quality]'))b.classList.toggle('selected',b.dataset.quality===settings.quality);
 for(const b of document.querySelectorAll('[data-time]'))b.classList.toggle('selected',b.dataset.time===settings.time);
 $('art-style').value=settings.art;$('art-note').textContent=artStyles.find(s=>s[0]===settings.art)[2];
 $('sensitivity').value=String(settings.sensitivity);$('sensitivity-value').textContent=settings.sensitivity.toFixed(2);
}
function openSettings(){
 if(phase==='playing'){togglePause();settingsWasPlaying=true;}
 $('settings-panel').hidden=false;syncSettingsUI();
}
function closeSettings(){
 $('settings-panel').hidden=true;
 if(settingsWasPlaying){settingsWasPlaying=false;phase='playing';$('overlay').hidden=true;clearInput();cameraReady=false;}
}
$('settings-open').onclick=openSettings;$('settings-pause').onclick=openSettings;$('settings-close').onclick=closeSettings;
$('settings-panel').addEventListener('click',e=>{if(e.target===$('settings-panel'))closeSettings();});
for(const b of document.querySelectorAll('[data-camera]'))b.onclick=()=>{settings.camera=b.dataset.camera;writeSetting('dust-valley-camera',settings.camera);cameraReady=false;syncSettingsUI();toast('CAMERA · '+settings.camera.toUpperCase(),1);};
for(const b of document.querySelectorAll('[data-quality]'))b.onclick=()=>{settings.quality=b.dataset.quality;writeSetting('dust-valley-quality',settings.quality);autoDowngraded=false;applyQuality();syncSettingsUI();toast('QUALITY · '+settings.quality.toUpperCase(),1);};
for(const b of document.querySelectorAll('[data-time]'))b.onclick=()=>{settings.time=b.dataset.time;writeSetting('dust-valley-time',settings.time);applyTime();syncSettingsUI();};
$('art-style').onchange=e=>{artRenderer.setStyle(e.target.value);settings.art=artRenderer.style;writeSetting('dust-valley-art',settings.art);syncSettingsUI();};
$('sensitivity').oninput=e=>{settings.sensitivity=Number(e.target.value);writeSetting('dust-valley-sensitivity',String(settings.sensitivity));$('sensitivity-value').textContent=settings.sensitivity.toFixed(2);};
syncSettingsUI();
let photoYaw=0,photoPitch=.32,photoDistance=8.5,photoDrag=false,photoX=0,photoY=0;
function enterPhoto(){
 if(phase!=='paused')return;phase='photo';
 $('overlay').hidden=true;$('photo-ui').hidden=false;document.body.classList.add('photo-mode');
 photoYaw=state.yaw+Math.PI;photoPitch=.32;photoDistance=8.5;
}
function exitPhoto(){
 if(phase!=='photo')return;phase='paused';document.body.classList.remove('photo-mode');$('photo-ui').hidden=true;$('overlay').hidden=false;
 $('overlay-label').textContent='TAKE A BREATHER';$('overlay-title').textContent='Ride paused.';$('overlay-copy').textContent='The desert isn’t going anywhere.';$('resume').hidden=false;
}
$('photo').onclick=enterPhoto;$('photo-exit').onclick=exitPhoto;
$('photo-save').onclick=()=>{
 renderArt();
 renderer.domElement.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='dust-valley-photo.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);},'image/png');
};
renderer.domElement.addEventListener('pointerdown',e=>{if(phase!=='photo')return;photoDrag=true;photoX=e.clientX;photoY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!photoDrag||phase!=='photo')return;
 photoYaw-=(e.clientX-photoX)*.006;photoPitch=Math.max(-.05,Math.min(1.25,photoPitch+(e.clientY-photoY)*.004));photoX=e.clientX;photoY=e.clientY;
});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(ev,()=>{photoDrag=false;});
renderer.domElement.addEventListener('wheel',e=>{if(phase!=='photo')return;e.preventDefault();photoDistance=Math.max(3,Math.min(22,photoDistance+e.deltaY*.01));},{passive:false});
function toast(text,duration=2){$('toast').textContent=text;toastTime=duration;}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;}
const wildTextures=new Map();
function wildTexture(map){
 if(wildTextures.has(map.id))return wildTextures.get(map.id);
 // A data texture keeps the sandiness alpha exact (canvas would premultiply it).
 // Rows are flipped so v=1 is z=-450, matching the terrain mesh UVs.
 const size=mobile?768:1024,painted=paintTerrainMap(map,size),rows=new Uint8Array(painted.length),row=size*4;
 for(let y=0;y<size;y++)rows.set(painted.subarray((size-1-y)*row,(size-y)*row),y*row);
 const t=new THREE.DataTexture(rows,size,size);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=textures.freeMacro.anisotropy;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
 wildTextures.set(map.id,t);return t;
}
const groundMap=()=>wild&&mode==='free'?wildTexture(wild):mode==='free'?textures.freeMacro:textures.macro;
let environmentKey='';
function updateEnvironment(){
  const key=wild?.id??'';if(key!==environmentKey){environmentKey=key;}
  syncView();
  if(!originalTerrainTextures)sandSurface.material.map=groundMap();syncSandOption();
  tireTracks.clear();
  materials.dirt.map=groundMap();
  for(let i=0;i<pos.count;i++)pos.setY(i,terrain(pos.getX(i),pos.getZ(i)));
  pos.needsUpdate=true;groundGeo.computeVertexNormals();groundGeo.computeBoundingSphere();sandSurface.update(activeSand?.isGpuSand?null:activeSand);
  mountains.forEach(groundMountain);rebuildMountainBatches();
  placeBoulders();placeGrass();arch.position.y=terrain(arch.position.x,arch.position.z);groundDetail.update(state.x,state.z,true);
  decorations.forEach(o=>{o.position.y=terrain(o.position.x,o.position.z)+o.userData.groundOffset;o.visible=mode==='free'?!freeClear(o.position.x,o.position.z):!o.userData.onTrack;});
  rebuildDecorationBatches();
  // The custom map always uses Dust Valley scenery, never the original course set.
  const original=false;
  for(const object of [...mountainBatches,...decorationBatches,boulderMesh,heroGroup,arch,grassMesh,groundDetail.pebbles,groundDetail.scrub])object.visible=!original;
  if(wild&&!original){const show=wild.scenery;mountainBatches.forEach(o=>o.visible=show.buttes);decorationBatches.forEach(o=>o.visible=show.decorations);boulderMesh.visible=show.boulders;grassMesh.visible=show.grass;arch.visible=show.arch;heroGroup.visible=false;groundDetail.pebbles.visible=groundDetail.scrub.visible=show.groundDetail!==false;}
  const rgb=original?coreScene.sceneSettings?.fogColor:null;
  originalFogColor=rgb?new THREE.Color().setRGB(...rgb.map(v=>v/255),THREE.SRGBColorSpace):null;
  scene.fog.color.set(originalFogColor??activeLight()?.fog??timePresets[settings.time]?.fog??timePresets.dawn.fog);
  document.querySelector('.gate-stat').hidden=mode==='free';
}
async function start(){
 if(starting)return;starting=true;
 wild=terrainMap('dunes');$('mcm-assets').hidden=false;
 const startButton=$('start'),startLabel=startButton.innerHTML;startButton.disabled=true;
 try{
  startButton.textContent='LOADING THE ORIGINAL BIKE…';corePreview??=await import('./mcm-core-preview.js');
  coreScene=customMcmScene(await corePreview.loadMcmCoreScene());
  coreScene.particleAssets=await loadMcmParticleAssets();recoveredParticles.setAssets(coreScene.particleAssets);
  if(!originalModels){const assets=await loadMcmOriginalModels();originalModels=createMcmOriginalModels(assets);scene.add(originalModels.root);}
 }
 catch(error){console.error(error);toast('The original bike could not load. Please try again.',5);return;}
 finally{starting=false;startButton.disabled=false;startButton.innerHTML=startLabel;}
 tireTracks.clear();
 state=corePreview.createMcmCoreState(coreScene,{spawn:wild.spawn,sand:$('sand-mode').checked});
 soilUniforms.sandAlbedoOn.value=0;soilUniforms.flowEnabled.value=0;soilUniforms.shadowEnabled.value=0;
 sandFx.setLook({...wild.view.spray,wind:wild.view.wind});
 updateOriginalTerrainMaterials();
 previewHeight=state.physics.baseHeight;
 activeSand=state.physics.renderSurface;
 sandSurface.update(activeSand?.isGpuSand?null:activeSand);
 updateEnvironment();
 document.querySelector('.map-panel>span').textContent=wild.name.toUpperCase()+' / LIVE';
 $('preview-badge').hidden=false;
 document.body.classList.add('mcm-preview');
 document.querySelector('.ride-hint').textContent='WASD ride · I / K rider lean · R recover';
 ridePose.reset(state);originalModels?.reset(state);elapsed=0;shake=0;cameraReady=false;accumulator=0;clearInput();
 document.body.classList.add('playing');for(const id of ['menu','location','footer','overlay','tutorial'])$(id).hidden=true;for(const id of ['hud','pause'])$(id).hidden=false;$('touch').hidden=!mobile;
 $('resume').hidden=false;
 // Compile every pipeline before the ride starts so first appearances do not hitch.
 {const spray=sandFx.root.visible;sandFx.root.visible=true;try{await renderer.compileAsync(scene,camera);}catch(e){}sandFx.root.visible=spray;}
 if(!readSetting('dust-valley-tutorial','')){phase='tutorial';$('tutorial').hidden=false;}else phase='playing';
}
$('tutorial-start').onclick=()=>{writeSetting('dust-valley-tutorial','1');$('tutorial').hidden=true;phase='playing';cameraReady=false;};
$('start').onclick=start;$('restart').onclick=start;$('reset').onclick=()=>{if(phase==='playing')recover();};
function recover(){
 if(!state.physics)return;
 const {scene,spawn,sand}=state.physics;
 state=corePreview.createMcmCoreState(scene,{spawn,sand:!!sand});
 updateOriginalTerrainMaterials();
 activeSand=state.physics.renderSurface;
 previewHeight=state.physics.baseHeight;
 ridePose.reset(state);originalModels?.reset(state);
 accumulator=0;cameraReady=false;crashTimer=0;
 tireTracks.clear();
 sandSurface.update(activeSand?.isGpuSand?null:activeSand);
 toast('BACK TO THE START');
}
function togglePause(){if(phase==='playing'){phase='paused';clearInput();$('overlay').hidden=false;$('overlay-label').textContent='TAKE A BREATHER';$('overlay-title').textContent='Ride paused.';$('overlay-copy').textContent='The desert isn’t going anywhere.';$('resume').hidden=false;$('photo').hidden=false;}else if(phase==='paused'){phase='playing';$('overlay').hidden=true;}}$('pause').onclick=togglePause;$('resume').onclick=togglePause;
$('home').onclick=()=>{activeSand=null;previewHeight=null;updateEnvironment();$('preview-badge').hidden=true;document.body.classList.remove('mcm-preview');phase='menu';clearInput();document.body.classList.remove('playing');for(const id of ['menu','location','footer'])$(id).hidden=false;for(const id of ['hud','pause','touch','overlay'])$(id).hidden=true;};
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function finish(){
 phase='finished';clearInput();$('overlay').hidden=false;
 $('overlay-label').textContent='RIDE COMPLETE';$('overlay-title').textContent='Ride complete.';
 $('overlay-copy').textContent=`Time ${formatTime(elapsed)}.`;
 $('resume').hidden=true;
}
const mapCtx=$('map').getContext('2d');
function drawMap(){
 const ctx=mapCtx;ctx.clearRect(0,0,180,150);
 // A local compass: the dunes have no route, only heading.
 ctx.strokeStyle='#e5e0ca44';ctx.lineWidth=1;ctx.beginPath();ctx.arc(90,75,54,0,TAU);ctx.stroke();
 ctx.fillStyle='#e7fb7a';ctx.font='11px Arial';ctx.textAlign='center';ctx.fillText('N',90,15);
 ctx.save();ctx.translate(90,75);ctx.rotate(-state.yaw);
 ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(-4,-4);ctx.lineTo(4,-4);ctx.closePath();ctx.fill();ctx.restore();
}
function drawSpeedLines(){
 if(!speedCtx)return;const w=speedCanvas.width,h=speedCanvas.height;speedCtx.clearRect(0,0,w,h);
 if(phase!=='playing')return;
 const kmh=state.speed*3.6;
 const k=Math.max(0,Math.min(1,(kmh-58)/90))*.5;
 if(k<.02)return;
 speedCtx.save();speedCtx.globalCompositeOperation='screen';
 for(let i=0;i<24;i++){
  const a=Math.random()*TAU,r0=Math.max(w,h)*(.2+Math.random()*.24),len=Math.max(w,h)*(.05+Math.random()*.16)*(.7+k);
  const x=w*.5+Math.cos(a)*r0,y=h*.47+Math.sin(a)*r0;
  speedCtx.strokeStyle=i%5===0?'rgba(231,251,122,.8)':'rgba(255,243,214,.5)';
  speedCtx.lineWidth=.6+Math.random()*1.2;speedCtx.beginPath();speedCtx.moveTo(x,y);speedCtx.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);speedCtx.stroke();
 }
 speedCtx.restore();
}
const target=new THREE.Vector3(),look=new THREE.Vector3(),chaseAnchor=new THREE.Vector3();let chaseYaw=0,chaseDistance=6.2,chaseHeight=2.2;let prev=performance.now(),accumulator=0,total=0;
// rAF timestamps can precede the start-up performance.now() reading; never let time run backwards.
function animate(now){requestAnimationFrame(animate);const dt=Math.max(0,Math.min((now-prev)/1000,.06));prev=now;total+=dt;pollGamepad();
if(settings.quality==='auto'&&!autoDowngraded&&phase==='playing'){
 perfTime+=dt;perfFrames++;
 if(perfTime>6){if(perfFrames/perfTime<48){autoDowngraded=true;applyQuality('low');toast('QUALITY · ADAPTED TO THIS DEVICE',2.4);}perfTime=0;perfFrames=0;}
}
impactFlash=Math.min(1,Math.max(0,impactFlash-dt*2.8));if($('impact'))$('impact').style.opacity=(impactFlash*.62).toFixed(2);drawSpeedLines();
const helmetView=settings.camera==='helmet'&&(phase==='playing'||phase==='paused');
const showBike=!helmetView&&(phase!=='menu'||camera.aspect>0.95);
if(phase==='playing'){
 elapsed+=dt;accumulator+=dt;
 while(accumulator>=.02){
  let result;
  try{result=corePreview.stepMcmCoreState(state,input,.02);}
  catch(error){console.error(error);state.physicsError=error.message;phase='paused';clearInput();$('overlay').hidden=false;$('overlay-label').textContent='PHYSICS STOPPED';$('overlay-title').textContent='Recovered physics stopped.';$('overlay-copy').textContent='This riding path reached an unresolved original dependency. Restart to ride again.';$('resume').hidden=true;break;}
  rideAudio.step(state,input,.02,camera.position);
  ridePose.push(state);originalModels?.push(state);
  // On soft sand the trenches are the tracks; tread decals stay off.
  tireTracks.update(state.crashed||state.physics.sand?[]:state.wheelContacts,surfaceHeight);
  if(result.landed>.5){
   impactFlash=Math.max(impactFlash,result.crashed?1:.28);
   puff(state.x,state.y-.3,state.z,result.crashed?18:12,1.05,1.2);
   shake=reduceMotion?0:Math.max(shake,Math.min(.3,result.landed*.035));
   if(result.crashed){crashTimer=1.1;toast('WIPEOUT',1);}
   else toast(result.landed>.9?`BIG AIR · ${state.airtime.toFixed(1)}s`:'AIR',1.2);
  }
  accumulator-=.02;
 }
 // The recovered wreck state replays a canned captured trajectory, so a crash
 // resets the ride instead of letting the camera chase the thrown bike.
 if(state.crashed){crashTimer-=dt;if(crashTimer<=0)recover();}
 else crashTimer=0;
 if(Math.hypot(state.x-startX(),state.z-startZ())>520){recover();toast('BACK TO THE DUNES');}
}
if(state.crashed)toast('WIPEOUT · R OR ↺ TO RECOVER',1);
 toastTime-=dt;if(toastTime<=0)$('toast').textContent='';
const renderAlpha=phase==='playing'?Math.min(1,accumulator/.02):1;
const visual=ridePose.sample(renderAlpha);
// The MCM preview particles are GLSL ShaderMaterials, unsupported by WebGPURenderer.
recoveredParticles.root.visible=false;
dust.visible=state.physicsBackend!=='recovered-core'&&settings.quality!=='low'&&!autoDowngraded;
const showOriginal=phase!=='menu'&&state.physicsBackend==='recovered-core'&&!!originalModels;

if(originalModels){originalModels.root.visible=showBike&&showOriginal;if(showOriginal)originalModels.update(state,$('mcm-rider').value,$('mcm-bike').value,renderAlpha);}
if(opponentModels){const opponent=state.opponents?.[0];opponentModels.root.visible=showOriginal&&!!opponent;if(opponentModels.root.visible)opponentModels.update(opponent,'rider02','bike02',renderAlpha);}

if(phase==='photo'){
 const target=new THREE.Vector3(visual.position.x,visual.position.y+.85,visual.position.z);
 const cp=Math.cos(photoPitch);
 camera.position.set(target.x+Math.sin(photoYaw)*cp*photoDistance,target.y+Math.sin(photoPitch)*photoDistance,target.z+Math.cos(photoYaw)*cp*photoDistance);
 camera.lookAt(target);camera.fov+=(55-camera.fov)*(1-Math.exp(-dt*8));camera.updateProjectionMatrix();
 sky.position.copy(camera.position);sunGlow.position.copy(camera.position).addScaledVector(sunDir,560);sunCore.position.copy(sunGlow.position);
 recoveredParticles.update(state,camera,renderAlpha);renderArt();rideAudio.update(state,input,false);return;
}
for(let i=0;i<2;i++){
 const c=state.wheelContacts&&state.wheelContacts[i],m=wheelShadows[i];
 if(c&&!state.air&&phase==='playing'){
  m.visible=true;const n=new THREE.Vector3(c.normal.x,c.normal.y,c.normal.z).normalize();
  m.position.set(c.x+n.x*.012,c.y+n.y*.012,c.z+n.z*.012);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);
  m.scale.set(.4,.28,1);
 }else m.visible=false;
}
if(phase==='menu'){const p=spawnRing(0);state.x=p.x;state.z=p.z;state.y=terrain(p.x,p.z)+.8;state.yaw=-.15;state.pitch=0;camera.position.set(p.x+19+Math.sin(total*.07)*3,terrain(p.x,p.z)+8,p.z+18);camera.lookAt(p.x-9,2,p.z-10);}
else if(helmetView){
 const head=new THREE.Vector3(0,1.12,.18).applyQuaternion(visual.quaternion);
 camera.position.copy(visual.position).add(head);
 const fx=Math.sin(visual.yaw),fz=Math.cos(visual.yaw);
 look.set(camera.position.x+fx*20,camera.position.y-1.1,camera.position.z+fz*20);
 camera.lookAt(look);camera.fov+=(75-camera.fov)*(1-Math.exp(-dt*6));camera.updateProjectionMatrix();
 for(const m of wheelShadows)m.visible=false;
}
else{
  if(!cameraReady){chaseAnchor.copy(visual.position);chaseYaw=visual.yaw;cameraReady=true;}
  // Follow the interpolated bike horizontally. Only suspension height is filtered.
  chaseAnchor.x=visual.position.x;chaseAnchor.z=visual.position.z;
  chaseAnchor.y+=(visual.position.y-chaseAnchor.y)*(1-Math.exp(-dt*8));
  const headingDelta=Math.atan2(Math.sin(visual.yaw-chaseYaw),Math.cos(visual.yaw-chaseYaw));
  chaseYaw+=headingDelta*(1-Math.exp(-dt*8));
  // Position and look-ahead share one filtered heading, avoiding camera whip on reversal.
  // Portrait screens crop the horizon hard; pull the chase camera back and
  // look further down the trail so the rider does not fill the view.
  const portrait=Math.max(0,Math.min(1,(1.25-camera.aspect)/.8));
  const far=settings.camera==='far',airLift=state.air?Math.min(1,state.airtime*1.4):0;const wantedDistance=6.2+portrait*2.3+(far?3.2:0)+Math.min(1.7,visual.speed*.05)+airLift*.9;
  const wantedHeight=2.45+portrait*1.0+(far?.9:0)+Math.min(.35,visual.speed*.006)+airLift*.3;
  chaseDistance+=(wantedDistance-chaseDistance)*(1-Math.exp(-dt*3));
  chaseHeight+=(wantedHeight-chaseHeight)*(1-Math.exp(-dt*3));
  const ahead=7+portrait*2.2+(far?2:0)+Math.min(1.4,visual.speed*.045)+airLift*1.3;
  // A slight rear-quarter offset reveals both wheels and the rider's lean.
  const side=(.95+(far?.9:0)+Math.min(.6,visual.speed*.018))*(camera.aspect>.95?1:.8);
  const rightX=Math.cos(chaseYaw),rightZ=-Math.sin(chaseYaw);
  target.set(chaseAnchor.x-Math.sin(chaseYaw)*chaseDistance+rightX*side,chaseAnchor.y+chaseHeight,chaseAnchor.z-Math.cos(chaseYaw)*chaseDistance+rightZ*side);
  target.y=Math.max(target.y,surfaceHeight(target.x,target.z)+1.4);
  look.set(chaseAnchor.x+Math.sin(chaseYaw)*ahead+rightX*side*.35,chaseAnchor.y+.7+portrait*.25,chaseAnchor.z+Math.cos(chaseYaw)*ahead+rightZ*side*.35);
  camera.position.copy(target);
  const rumble=reduceMotion?0:Math.min(.016,Math.pow(visual.speed/36,2)*.016);
  if(rumble&&!state.air){camera.position.x+=Math.sin(total*41)*rumble;camera.position.y+=Math.cos(total*59)*rumble*.7;}
  if(shake>.001){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake*.6;camera.position.z+=(Math.random()-.5)*shake;shake*=Math.exp(-dt*7);}
  camera.lookAt(look);if(!reduceMotion)camera.rotateZ(-visual.roll*.04);const fovTarget=70+Math.min(12,visual.speed*.4)+((input.boost&&state.boost>0&&input.gas)?5:0);camera.fov+=(fovTarget-camera.fov)*(1-Math.exp(-dt*4));camera.updateProjectionMatrix();
}


sun.position.set(state.x+sunOffset.x,state.y+sunOffset.y,state.z+sunOffset.z);sun.target.position.set(state.x,state.y,state.z);soilUniforms.sunDir.value.copy(sunDir);skyUniforms.time.value+=dt;
sandFx.root.visible=false;
if(phase==='playing'&&state.speed>4&&!state.air){
 const back=1.05;
 puff(state.x-Math.sin(state.yaw)*back,state.y-.55,state.z-Math.cos(state.yaw)*back,2,.3,.7);
}
for(let i=0;i<moteCount;i++){const m=moteBase[i];motePos[i*3]=camera.position.x+m.x+Math.sin(total*.13+m.phase)*1.2;motePos[i*3+1]=camera.position.y-1+m.y+Math.cos(total*.09+m.phase)*.35;motePos[i*3+2]=camera.position.z+m.z+Math.cos(total*.11+m.phase)*1.2;}motePoints.update();
particles.forEach((p,i)=>{p.life-=dt*.62;if(p.life>0){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vx*=1-dt*1.4;p.vz*=1-dt*1.4;p.vy+=.12*dt;}dustPositions[i*3]=p.x;dustPositions[i*3+1]=p.life>0?p.y:-100;dustPositions[i*3+2]=p.z;});dustPoints.update();
rideAudio.update(state,input,phase==='playing');
$('speed').textContent=Math.round(state.speed*3.6);$('time').textContent=formatTime(elapsed);
$('gear').textContent=state.gear||1;$('rpm').style.width=Math.min(100,(state.rpm||1200)/10000*100)+'%';
if(!$('loading').hidden)$('loading').hidden=true;
}
function resize(){renderer.setSize(innerWidth,innerHeight);if(speedCanvas){speedCanvas.width=innerWidth;speedCanvas.height=innerHeight;}camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
requestAnimationFrame(animate);
// Read-only diagnostics for smoke tests and performance inspection.
// Start on the sand: Sidewinder Dunes unless the rider last chose another terrain.
window.__game={soil:soilUniforms,scene,place:(x,z,yaw)=>{state.physics.spawn={x,z,yaw};ridePose.reset(state);cameraReady=false;accumulator=0;},backend:()=>rendererBackend,camera:()=>({x:camera.position.x,y:camera.position.y,z:camera.position.z,fov:camera.fov,look:{x:look.x,y:look.y,z:look.z}}),sandFx:()=>({dust:sandFx.spray.activeDust,clods:sandFx.spray.activeClods,visible:sandFx.root.visible}),presentation:()=>({style:artRenderer.style,particles:recoveredParticles.count,nativeParticles:recoveredParticles.nativeCount,particleTexture:recoveredParticles.textureName,particleSprites:[...new Set(recoveredParticles.rows.map(r=>r.sprite))]}),audio:()=>rideAudio.original?.diagnostics()??{ready:false},sandSample:(x,z)=>activeSand?{height:activeSand.height(x,z),displacement:activeSand.displacementAt(x,z),compaction:activeSand.compaction(x,z)}:null,environment:()=>({sand:activeSand?{version:activeSand.version,tiles:activeSand.tiles.size,renderedTiles:sandSurface.meshes.size}:null,height:state.physics.height(state.x,state.z),visualHeight:terrain(state.x,state.z),mountains:mountains.map(m=>({x:m.position.x,z:m.position.z,radius:m.userData.radius*Math.max(m.scale.x,m.scale.z),foundation:m.userData.foundation}))}),snapshot:()=>({phase,elapsed,countdown:0,originalAssets:{rider:$('mcm-rider').value,bike:$('mcm-bike').value,parts:originalModels?.parts,terrainTextures:!!originalTerrainTextures},tireTrackSegments:tireTracks.count,...state}),renderer};
