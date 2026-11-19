import {RemixWorld,remixLevels} from './remix-worlds.js';
import {terrainMaps,terrainMap,paintTerrainMap} from './terrain-maps.js';
import {createRetroBike} from './retro-bike.js';
import {loadMcmParticleAssets} from './mcm-particle-assets.js';
import {VoxelTerrain} from './voxel-terrain.js';
import {ArtStyleRenderer,artStyles} from './art-styles.js';
import {McmParticles} from './mcm-particles.js';
import {matchSkyHorizon,skyUniforms} from './sky-haze.js';
import mcmSceneVariants from './mcm-scene-variants.json';
import mcmSceneSettings from './mcm-scene-settings.json';
import * as THREE from 'three';
import {bikeLinkagePoints,fitBikeLink} from './bike-linkage.js';
import './style.css';
import {terrainIndices,sampleGrid} from './height-grid.js';
import {inJumpZone,jumps} from './jump-park.js';
import {heroRocks} from './props.js';
import {createMcmTerrainTextures,createMcmTerrainMaterial} from './mcm-terrain-material.js';
import {mcmMaps} from './mcm-map-catalog.js';
import {loadMcmOriginalModels,createMcmOriginalModels} from './mcm-original-models.js';
import {createRider} from './rider.js';
import {RidePose,steeringRotation} from './ride-pose.js';
import {batchMeshes} from './mesh-batch.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GroundDetail} from './ground-detail.js';
import { TireTracks, createTreadTexture } from './tire-tracks.js';
import { createTextures, applyTerrainTexture, createSkyTexture, createDustTexture, soilUniforms } from './textures.js';
import {TrackMap} from './sand-trackmap.js';
import {SandFx} from './sand-fx.js';
import {SandFlowGPU} from './sand-flow-gpu.js';
import {HorizonTerrain} from './horizon-terrain.js';
import {FineSandGPU} from './sand-fine-gpu.js';
import {GpuSandSurface} from './sand-gpu-surface.js';
import {createFineSandMesh} from './sand-fine-render.js';
import {CSMShadowNode} from 'three/addons/csm/CSMShadowNode.js';
import {fog as fogNode,densityFogFactor,uniform as tslUniform} from 'three/tsl';
import {createSizedPoints} from './sized-points.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {SandSurface} from './sand-surface.js';
import {RideAudio} from './audio.js';
import {track,terrain as raceTerrain,freeTerrain,trackDistance,nearestTrack,createState,resetBike,stepBike,TAU} from './world.js';
let activeSand=null,corePreview=null,coreScene=null;
let previewHeight=null,remix=null,wild=null,farTerrainMesh=null,viewLow=false,sandFlow=null,flowReadClock=0,fineSand=null,fineMesh=null,gpuSand=null;
let starting=false;
let mode='free';
let physicsMode='classic';
const simulationStep=()=>physicsMode==='mcm-preview'?.02:1/120;
const terrain=(x,z)=>remix?remix.height(x,z):activeSand?activeSand.height(x,z):(previewHeight?previewHeight(x,z):(mode==='free'?freeHeight(x,z):raceTerrain(x,z)));
// Wild terrains replace the free-ride basin: height, scenery clearance and paint.
const freeHeight=(x,z)=>wild?wild.height(x,z):freeTerrain(x,z);
const freeClear=(x,z)=>wild?wild.clear(x,z):inJumpZone(x,z);
const $=id=>document.getElementById(id);
let originalModels,opponentModels;
for(const map of mcmMaps){const option=document.createElement('option');option.value=map.id;option.textContent=map.title;$('mcm-map').append(option);}$('mcm-map').value='quarries-dunes';
function updateMcmScenes(){$('world-start-note').hidden=$('mcm-map').value!=='quarries-dunes';const select=$('mcm-scene');select.replaceChildren();const variants=mcmSceneVariants[$('mcm-map').value]??[];for(const scene of variants){const option=document.createElement('option');option.value=scene.source;option.textContent=scene.title??scene.source;select.append(option);}select.disabled=variants.length===0;if(!variants.length){const option=document.createElement('option');option.textContent='Default practice environment';select.append(option);}}
$('mcm-map').addEventListener('change',updateMcmScenes);updateMcmScenes();
const mapCache=new Map();
async function loadSelectedMcmMap(base){const id=$('mcm-map').value;let asset=mapCache.get(id);if(!asset){const response=await fetch(mcmMaps.find(m=>m.id===id).url);if(!response.ok)throw Error('Original terrain download failed');asset=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();mapCache.set(id,asset);}const settings=mcmSceneVariants[id]?.find(scene=>scene.source===$('mcm-scene').value)??mcmSceneSettings[id];const shadow=settings?.lights.find(light=>light.type==='ObjectPoint'&&light.castsShadows)?.position??asset.shadowTarget;return {...base,mapId:id,terrainMode:asset.terrainMode,shadowTarget:shadow,sceneSettings:settings,rendering:asset.rendering,terrain:asset.terrain};}

$('physics-mode').onchange=()=>{if($('physics-mode').value==='mcm-preview'&&$('terrain-map')?.value&&$('terrain-map').onchange){$('terrain-map').value='';$('terrain-map').onchange();}$('mcm-assets').hidden=$('physics-mode').value!=='mcm-preview';physicsMode=$('physics-mode').value;syncSandOption();$('physics-note').textContent=physicsMode==='mcm-preview'?'Original bike and rider physics, maps and sounds. Full matching is still in progress.':'Original Dust Valley handling.';$('menu-extra-control').innerHTML=physicsMode==='mcm-preview'?'I / K <b>Rider lean</b>':'SPACE <b>Boost</b>';$('tutorial-throttle').textContent=physicsMode==='mcm-preview'?'Hold W or GAS. Release to coast; S or BRAKE slows down.':'Hold W or GAS. Tap SPACE for boost.';};
function syncSandOption(){$('sand-option').hidden=false;$('sand-mode').disabled=false;$('sand-note').textContent='Tires carve soft sand in every mode. Switch off for hardpack.';}
$('physics-mode').onchange();
for(const map of terrainMaps){const option=document.createElement('option');option.value=map.id;option.textContent=`${map.name} · ${map.tag}`;$('terrain-map').append(option);}
$('terrain-map').onchange=()=>{
 const map=terrainMap($('terrain-map').value);writeSetting('dust-valley-terrain',$('terrain-map').value||'basin');
 if(map&&$('remix-level').value){$('remix-level').value='';$('remix-level').onchange();}
 $('terrain-description').textContent=map?map.description:'Four open terrains, each with its own soil. Dust Valley handling.';
 document.querySelector('.mode-picker').hidden=!!map||!!$('remix-level').value;$('legacy-game').hidden=!!$('remix-level').value;
 // Wild terrains ride with Dust Valley physics; keep the legacy picker in sync.
 if(map&&$('physics-mode').value==='mcm-preview'){$('physics-mode').value='classic';$('physics-mode').onchange();}
 $('mcm-assets').hidden=!!map||!!$('remix-level').value||$('physics-mode').value!=='mcm-preview';
 $('physics-note').textContent=map?'WILD TERRAIN · Dust Valley bike handling · deformable soil tuned per map':$('remix-level').value?$('physics-note').textContent:'Original bike and rider physics, maps and sounds. Full matching is still in progress.';
 if(map){mode='free';document.querySelectorAll('[data-mode]').forEach(v=>{v.classList.toggle('selected',v.dataset.mode==='free');v.setAttribute('aria-pressed',String(v.dataset.mode==='free'));});}
 if(phase==='menu'){wild=map;activeSand=null;updateEnvironment();}
};
for(const level of remixLevels){const option=document.createElement('option');option.value=level.id;option.textContent=level.name;$('remix-level').append(option);}
$('remix-level').onchange=()=>{const level=remixLevels.find(l=>l.id===$('remix-level').value);if(level&&$('terrain-map').value){$('terrain-map').value='';$('terrain-map').onchange();}$('legacy-game').hidden=!!level;$('remix-description').textContent=level?level.description:'Five experimental worlds with new rules.';$('mcm-assets').hidden=!!level||$('physics-mode').value!=='mcm-preview';$('sand-option').hidden=!!level;document.querySelector('.mode-picker').hidden=!!level;$('physics-note').textContent=level?'REMIX · Playground bike handling · moving worlds and new objectives':'Original bike and rider physics, maps and sounds. Full matching is still in progress.';};
$('remix-action').onclick=()=>remix?.wakeGiant();window.addEventListener('keydown',e=>{if(e.code==='KeyE'&&phase==='playing')remix?.wakeGiant();});

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
const activeLight=()=>wild&&mode==='free'&&!previewHeight&&!remix?wild.view.light:null;
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
// Every rut is also written to a world-space track map so trenches stay
// visible on the coarse terrain far behind the live sand patch.
const trackMap=new TrackMap(mobile?1024:2048),trackTexture=new THREE.DataTexture(trackMap.data,trackMap.size,trackMap.size);
trackTexture.magFilter=THREE.LinearFilter;trackTexture.minFilter=THREE.LinearMipmapLinearFilter;trackTexture.generateMipmaps=true;trackTexture.needsUpdate=true;
soilUniforms.trackMap.value=trackTexture;soilUniforms.trackTexel.value=1/trackMap.size;
// WebGPU has no partial CPU upload, so changed texels go through a small
// staging texture and a GPU-side copy into the full track map.
const TRACK_TILE=64,trackStaging=new THREE.DataTexture(new Uint8Array(TRACK_TILE*TRACK_TILE*4),TRACK_TILE,TRACK_TILE);
let trackUploaded=null;const trackRegion=new THREE.Box2(),trackOrigin=new THREE.Vector2();
function flushTrackMap(){
 if(trackUploaded!==trackMap.version){if(trackUploaded===null)renderer.initTexture(trackTexture);else trackTexture.needsUpdate=true;trackUploaded=trackMap.version;trackMap.takeDirty();return;}
 const b=trackMap.takeDirty();if(!b)return;
 const size=trackMap.size,data=trackMap.data,stage=trackStaging.image.data;
 for(let y0=b.minY;y0<b.maxY;y0+=TRACK_TILE)for(let x0=b.minX;x0<b.maxX;x0+=TRACK_TILE){
  const w=Math.min(TRACK_TILE,b.maxX-x0),h=Math.min(TRACK_TILE,b.maxY-y0);
  for(let y=0;y<h;y++)stage.set(data.subarray(((y0+y)*size+x0)*4,((y0+y)*size+x0+w)*4),y*TRACK_TILE*4);
  trackStaging.needsUpdate=true;trackRegion.min.set(0,0);trackRegion.max.set(w,h);trackOrigin.set(x0,y0);
  renderer.copyTextureToTexture(trackStaging,trackTexture,trackRegion,trackOrigin);
 }
}
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
 const v=wild&&mode==='free'&&!previewHeight&&!remix?wild.view:null,low=viewLow;
 scene.fog.near=v?v.fog[0]*(low?.7:1):180;scene.fog.far=v?v.fog[1]*(low?.6:1):(low?400:540);
 camera.far=v?v.far*(low?.65:1):1000;camera.updateProjectionMatrix();
 if(activeLight()!==syncView.light){syncView.light=activeLight();applyTime();}
 soilUniforms.rippleStrength.value=v&&!gpuSand?v.ripple:0;soilUniforms.sparkle.value=v?v.sparkle:0;soilUniforms.windDir.value.set(v?v.wind.x:1,v?v.wind.z:0).normalize();
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
 if(state.physicsBackend==='recovered-core'){
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
function surfaceHeight(x,z){if(remix)return remix.height(x,z);if(activeSand)return activeSand.height(x,z);if(previewHeight)return previewHeight(x,z);return sampleGrid(i=>pos.getY(i),x,z,GROUND_SEGMENTS,GROUND_SPACING);}

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
// Shared hero boulders have matching Cannon spheres in world.js.
const heroGroup=new THREE.Group(),heroGeo=new THREE.DodecahedronGeometry(1,1);
const heroMeshes=heroRocks.map(rock=>{
 const p=track(rock.s*TAU),x=p.x+p.tz*rock.side,z=p.z-p.tx*rock.side;
 const m=new THREE.Mesh(heroGeo,materials.rock);m.position.set(x,terrain(x,z)+rock.r*.35,z);m.scale.set(rock.r*.8,rock.r*.72,rock.r);m.rotation.set(rock.s*2,rock.s*7,rock.s);m.castShadow=true;m.receiveShadow=true;heroGroup.add(m);return m;
});
scene.add(heroGroup);
function placeHeroRocks(){heroMeshes.forEach((m,i)=>{const rock=heroRocks[i],p=track(rock.s*TAU),x=p.x+p.tz*rock.side,z=p.z-p.tx*rock.side;m.position.set(x,terrain(x,z)+rock.r*.35,z);});}
placeHeroRocks();
// A single large stone arch acts as a landmark on the far side of the basin.
const archP=track(.44*TAU),archX=archP.x+archP.tz*-72,archZ=archP.z-archP.tx*-72;
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
const trackObjects=new THREE.Group();scene.add(trackObjects);
// Track boundary stakes: one instanced draw for every marker instead of 320.
const stakeGeo=new THREE.BoxGeometry(.16,1.2,.16),stakes=new THREE.InstancedMesh(stakeGeo,materials.white,320),stakeMatrix=new THREE.Matrix4();
let stakeIndex=0;
for(let i=0;i<160;i++){const a=i/160*TAU,p=track(a);for(const side of [-1,1]){
  const x=p.x+p.tz*11*side,z=p.z-p.tx*11*side;
  stakes.setMatrixAt(stakeIndex++,stakeMatrix.makeTranslation(x,terrain(x,z)+.6,z));
}}
stakes.castShadow=true;stakes.receiveShadow=true;stakes.instanceMatrix.needsUpdate=true;stakes.computeBoundingSphere();trackObjects.add(stakes);
// Tall flags make the free-ride jump lines findable from a distance.
const jumpMarkers=new THREE.Group();
{
 const poleGeo=new THREE.CylinderGeometry(.07,.1,4,6),flagGeo=new THREE.BoxGeometry(.95,.55,.05);
 const poles=new THREE.InstancedMesh(poleGeo,materials.white,jumps.length*2),flags=new THREE.InstancedMesh(flagGeo,new THREE.MeshStandardMaterial({color:'#ff9b52',roughness:.7,side:THREE.DoubleSide}),jumps.length*2);
 const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3(1,1,1);
 let index=0;
 for(const j of jumps){
  const ax=Math.sin(j.yaw),az=Math.cos(j.yaw),cx=Math.cos(j.yaw),cz=-Math.sin(j.yaw);
  for(const side of [-1,1]){
   const x=j.x+ax*3+cx*side*(j.width*.7+2),z=j.z+az*3+cz*side*(j.width*.7+2),y=freeTerrain(x,z);
   poles.setMatrixAt(index,matrix.compose(position.set(x,y+2,z),quaternion,scale));
   flags.setMatrixAt(index,matrix.compose(position.set(x,y+3.85,z),quaternion,scale));
   if(side<0){
    const cv=document.createElement('canvas');cv.width=128;cv.height=64;const g=cv.getContext('2d');
    g.fillStyle='#24362c';g.fillRect(0,0,128,64);g.fillStyle='#e7fb7a';g.font='bold 34px Arial';g.textAlign='center';g.fillText(String(Math.floor(index/2)+1).padStart(2,'0'),64,44);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,toneMapped:false}));sign.position.set(x,y+4.35,z);sign.scale.set(1.15,.58,1);jumpMarkers.add(sign);
   }
   index++;
  }
 }
 poles.castShadow=true;flags.castShadow=true;poles.computeBoundingSphere();flags.computeBoundingSphere();
 jumpMarkers.add(poles,flags);jumpMarkers.visible=false;scene.add(jumpMarkers);
}
const gates=[];for(let i=0;i<12;i++){const a=i/12*TAU,p=track(a),g=new THREE.Group();g.position.set(p.x,terrain(p.x,p.z),p.z);g.rotation.y=Math.atan2(p.tx,p.tz);trackObjects.add(g);const mat=materials.lime.clone();for(const x of [-9,9])box(.3,7,.3,mat,x,3.5,0,g);box(18.3,.6,.4,mat,0,7,0,g);const cv=document.createElement('canvas');cv.width=256;cv.height=64;const ctx=cv.getContext('2d');ctx.fillStyle='#24362c';ctx.fillRect(0,0,256,64);ctx.fillStyle='#e7fb7a';ctx.font='bold 30px Arial';ctx.textAlign='center';ctx.fillText(i===0?'DUST / FINISH':`GATE ${String(i).padStart(2,'0')} →`,128,43);const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;const signMat=new THREE.MeshBasicMaterial({map:tx,side:THREE.FrontSide,toneMapped:false});
  // Back-to-back panels so the banner reads correctly from either approach.
  for(const facing of [0,1]){const sign=mesh(new THREE.PlaneGeometry(6,1.5),signMat,0,6.5,facing?.012:-.012,g);sign.rotation.y=facing?Math.PI:0;}
  gates.push({group:g,mat,p,yaw:g.rotation.y});}
// Checkered start-gantry banners make the finish gate read from a distance.
{
 const cc=document.createElement('canvas');cc.width=cc.height=64;const cg=cc.getContext('2d');
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){cg.fillStyle=(x+y)%2?'#e9e2cc':'#1f3028';cg.fillRect(x*8,y*8,8,8);}
 const ct=new THREE.CanvasTexture(cc);ct.colorSpace=THREE.SRGBColorSpace;const cm=new THREE.MeshBasicMaterial({map:ct,side:THREE.DoubleSide,toneMapped:false});
 for(const side of [-1,1]){const banner=new THREE.Mesh(new THREE.PlaneGeometry(.8,3.1),cm);banner.position.set(side*9,4.1,.03);gates[0].group.add(banner);}
}
// Tyre-stack barriers and a start-area prop break up the edge of the course.
const tyreStacks=new THREE.Group(),tyreParts=[];
for(const [a,side] of [[0,-15],[0,15],[.28,-15],[.28,15]]){
 const p=track(a*TAU),x=p.x+p.tz*side,z=p.z-p.tx*side,y=terrain(x,z);
 for(let k=0;k<3;k++){const t=new THREE.Mesh(new THREE.TorusGeometry(.5,.18,8,16),materials.dark);t.rotation.x=Math.PI/2;t.position.set(x,y+.2+k*.34,z);t.userData.groundOffset=.2+k*.34;tyreParts.push(t);}
}
tyreStacks.add(...batchMeshes(tyreParts,tyreStacks));scene.add(tyreStacks);
function makeBike(){
  const bike=new THREE.Group(),body=new THREE.Group();bike.add(body);body.position.y=-.54;
  const wheels=[];
  for(const z of [-1.05,1.1]){
    const wheel=new THREE.Group();scene.add(wheel);wheels.push(wheel);
    const tire=mesh(new THREE.TorusGeometry(.61,.16,10,32),materials.dark,0,0,0,wheel);tire.rotation.y=Math.PI/2;
    const hub=mesh(new THREE.CylinderGeometry(.12,.12,.3,12),materials.steel,0,0,0,wheel);hub.rotation.z=Math.PI/2;
    const rim=mesh(new THREE.TorusGeometry(.43,.035,6,24),materials.steel,0,0,0,wheel);rim.rotation.y=Math.PI/2;
    for(let j=0;j<12;j++){const spoke=box(.03,.87,.025,materials.steel,0,0,0,wheel);spoke.rotation.x=j*Math.PI/6;}
    for(let j=0;j<24;j++){const a=j/24*TAU;const tread=box(.29,.08,.14,materials.dark,0,Math.cos(a)*.745,Math.sin(a)*.745,wheel);tread.rotation.x=a;}
    // Wheels animate as assemblies; their tread and spokes need only two draws.
    const brake=mesh(new THREE.RingGeometry(.16,.29,32),materials.steel,.18,0,0,wheel);brake.rotation.y=Math.PI/2;brake.material=materials.steel;
    const parts=[...wheel.children];
    const assemblies=batchMeshes(parts,wheel);
    // The old art had a 0.79 m outer radius around a 0.61 m physics tire.
    for(const assembly of assemblies)assembly.geometry.scale(.61/.79,.61/.79,.61/.79);
    for(const part of parts){wheel.remove(part);part.geometry.dispose();}
  }
  // A twin-cradle frame surrounds the engine and joins both suspension mounts.
  const tube=(a,b,r=.035,mat=materials.steel)=>{
    const part=mesh(new THREE.CylinderGeometry(r,r,1,8),mat,0,0,0,body);
    fitBikeLink(part,new THREE.Vector3(...a),new THREE.Vector3(...b));return part;
  };
  for(const side of [-1,1]){
    const x=side*.19;
    tube([x,1.18,.65],[x,.26,.35]);tube([x,.26,.35],[x,.25,-.28]);
    tube([x,.25,-.28],[x,.96,-.5]);tube([x,.96,-.5],[x,1.18,.65]);
    tube([x,.96,-.5],[x,1.02,-1.05],.025);tube([x,.42,-.1],[x,1.02,-1.05],.025);
  }
  // Radiator louvers, skid plate and side graphics give the chassis a readable silhouette.
  mesh(new RoundedBoxGeometry(.42,.08,.6,2,.03),materials.dark,0,.22,.02,body);
  for(const side of [-1,1]){
    for(let i=0;i<6;i++)box(.035,.025,.27,materials.dark,side*.255,.78+i*.035,.4,body);
    const decal=box(.008,.08,.35,materials.lime,side*.283,.88,-.5,body);decal.rotation.x=-.12;
    tube([side*.23,1.12,.67],[side*.23,1.31,.72],.025);
  }
  const tank=mesh(new RoundedBoxGeometry(.48,.32,.62,3,.07),materials.lime,0,1.02,.3,body);tank.rotation.x=-.14;
  const seat=mesh(new RoundedBoxGeometry(.39,.13,1.12,3,.05),materials.dark,0,1.14,-.36,body);seat.rotation.x=.035;
  const engine=box(.38,.4,.48,materials.steel,0,.53,.02,body);engine.rotation.x=.13;
  for(let i=0;i<5;i++)box(.43,.023,.32,materials.dark,0,.55+i*.055,.12,body);
  const caseCover=mesh(new THREE.CylinderGeometry(.18,.18,.44,16),materials.steel,0,.38,-.12,body);caseCover.rotation.z=Math.PI/2;
  for(const side of [-1,1]){
    const panel=mesh(new RoundedBoxGeometry(.055,.34,.58,2,.025),materials.white,side*.25,.85,-.48,body);panel.rotation.x=-.12;
    box(.18,.05,.18,materials.steel,side*.32,.32,-.16,body);
  }
  const frontFender=mesh(new THREE.SphereGeometry(1,16,8),materials.lime,0,0,0);frontFender.scale.set(.22,.055,.5);frontFender.castShadow=true;
  const rearFender=mesh(new THREE.SphereGeometry(1,16,8),materials.dark,0,0,0,body);rearFender.scale.set(.2,.045,.5);rearFender.position.set(0,1.02,-.98);
  const exhaust=mesh(new THREE.CylinderGeometry(.065,.085,.64,10),materials.steel,.29,.88,-.72,body);exhaust.rotation.x=Math.PI/2+.12;
  tube([.23,.51,.25],[.3,.65,-.35],.045);
  const handlebar=new THREE.Group();body.add(handlebar);handlebar.position.set(0,1.34,.7);
 box(.3,.085,.09,materials.lime,0,.02,0,handlebar);
 box(.3,.26,.035,materials.white,0,1.02,.98,body);


  const bar=mesh(new THREE.CylinderGeometry(.035,.035,1.08,10),materials.steel,0,0,0,handlebar);bar.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const grip=mesh(new THREE.CylinderGeometry(.052,.052,.19,10),materials.dark,side*.49,0,0,handlebar);grip.rotation.z=Math.PI/2;}
  // Batch rigid chassis pieces by material without baking the animated body offset.
  const bodyOffset=body.position.y;body.position.y=0;body.updateMatrixWorld(true);
  const rigidParts=body.children.filter(o=>o.isMesh);batchMeshes(rigidParts,body);
  for(const part of rigidParts){body.remove(part);part.geometry.dispose();}
  body.position.y=bodyOffset;
  const flameMat=new THREE.MeshBasicMaterial({color:'#ffb35c',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
  const boostFlame=mesh(new THREE.ConeGeometry(.11,.7,8),flameMat,.3,1.02,-1.18,body);boostFlame.rotation.x=Math.PI/2;boostFlame.visible=false;boostFlame.castShadow=false;
  const boostGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:createDustTexture(),color:'#ffb15c',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));boostGlow.scale.set(.6,.6,1);boostGlow.position.set(.3,1.02,-1.18);boostGlow.renderOrder=3;boostGlow.visible=false;body.add(boostGlow);
  const rider=createRider();body.add(rider.root);
  body.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(bike);
  const forkStyles={forkUpper:[.08,materials.lime],forkLower:[.05,materials.steel],swingarm:[.075,materials.steel],brace:[.035,materials.steel],shock:[.075,materials.dark],axle:[.055,materials.steel]};
  const kinds=['forkUpper','forkLower','swingarm','brace','forkUpper','forkLower','swingarm','brace','shock','axle','axle'];
  const forks=kinds.map(kind=>{const [radius,mat]=forkStyles[kind];const part=mesh(kind==='swingarm'?new THREE.BoxGeometry(.11,1,.15):new THREE.CylinderGeometry(radius,radius,1,10),mat,0,0,0);part.castShadow=true;return part;});
  return{bike,body,wheels,rider,handlebar,forks,frontFender,boostFlame,boostGlow};
}
const {bike,body,wheels,rider,handlebar,forks,frontFender,boostFlame,boostGlow}=makeBike();
// Retro '98 skin: an original low-poly bike and rider on the same rig, so
// handling, suspension links and rider IK are shared with the modern bike.
const retro=createRetroBike(),retroWheelParts=wheels.map(w=>{const g=retro.wheel();w.add(g);return g;});
const modernBodyParts=body.children.filter(o=>o.isMesh&&o!==boostFlame),modernBars=[...handlebar.children],modernWheelParts=wheels.map((w,i)=>w.children.filter(o=>o!==retroWheelParts[i]));
body.add(retro.chassis,retro.rider.root);handlebar.add(retro.bars);scene.add(retro.frontFender);
const linkKinds=['forkUpper','forkLower','swingarm','brace','forkUpper','forkLower','swingarm','brace','shock','axle','axle'];
const retroForks=linkKinds.map(kind=>{const {geometry,material}=retro.link(kind);const part=new THREE.Mesh(geometry,material);part.castShadow=true;scene.add(part);return part;});
let retroOn=false;
function applyBikeStyle(style){
 retroOn=style==='retro';
 modernBodyParts.forEach(o=>o.visible=!retroOn);modernBars.forEach(o=>o.visible=!retroOn);modernWheelParts.flat().forEach(o=>o.visible=!retroOn);rider.root.visible=!retroOn;
 retro.chassis.visible=retroOn;retro.bars.visible=retroOn;retro.rider.root.visible=retroOn;retroWheelParts.forEach(o=>o.visible=retroOn);
}
$('bike-style').value=readSetting('dust-valley-bike','modern')==='retro'?'retro':'modern';
$('bike-style').onchange=()=>{writeSetting('dust-valley-bike',$('bike-style').value);applyBikeStyle($('bike-style').value);};
applyBikeStyle($('bike-style').value);
// A translucent best-lap ghost: wheel rings, frame and rider block, no shadows.
const ghostMat=new THREE.MeshBasicMaterial({color:'#d8ff74',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
const ghostBike=new THREE.Group();
for(const z of [-1.05,1.1]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.61,.045,8,24),ghostMat);wheel.rotation.y=Math.PI/2;wheel.position.set(0,-.55,z);ghostBike.add(wheel);}
const ghostFrame=new THREE.Mesh(new THREE.BoxGeometry(.34,.42,1.3),ghostMat);ghostFrame.position.set(0,.15,.02);ghostBike.add(ghostFrame);
const ghostRider=new THREE.Mesh(new THREE.BoxGeometry(.45,.72,.36),ghostMat);ghostRider.position.set(0,.65,-.15);ghostBike.add(ghostRider);
const ghostHead=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),ghostMat);ghostHead.position.set(0,1.1,-.1);ghostBike.add(ghostHead);
ghostBike.visible=false;scene.add(ghostBike);
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
 voxelTerrain.root.visible=!remix&&artRenderer.style==='voxel'&&phase!=='menu';
 const hidden=[];
 if(remix)for(const mesh of [ground,...sandSurface.meshes.values(),trackObjects,tyreStacks,jumpMarkers,...mountainBatches,...decorationBatches,boulderMesh,heroGroup,arch,grassMesh,groundDetail.pebbles,groundDetail.scrub,sky,sunGlow,sunCore])if(mesh.visible){hidden.push(mesh);mesh.visible=false;}
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
function readGhost(){try{const g=JSON.parse(localStorage.getItem('dust-valley-ghost'));return Array.isArray(g)&&g.length>2?g:null;}catch{return null;}}
let ghostBest=readGhost(),activeGhost=ghostBest,ghostRecord=[],ghostClock=0;
let state=createState(),phase='menu',elapsed=0,lap=1,nextGate=1,score=0,toastTime=0,cameraReady=false,countdown=0,lapStart=0,combo=0,comboTimer=0,wrongTime=0,shake=0;let bestLap=Infinity;try{bestLap=Number(localStorage.getItem('dust-valley-best-lap'))||Infinity;}catch{}
let laps=3,perfTime=0,perfFrames=0,autoDowngraded=false,impactFlash=0;
function sampleGhost(t){
 const g=activeGhost;if(!g||g.length<2||t<g[0][0]||t>g[g.length-1][0])return null;
 let lo=0,hi=g.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(g[mid][0]<=t)lo=mid;else hi=mid;}
 const a=g[lo],b=g[hi],k=(t-a[0])/Math.max(.001,b[0]-a[0]);
 const yaw=a[4]+Math.atan2(Math.sin(b[4]-a[4]),Math.cos(b[4]-a[4]))*k;
 return{x:a[1]+(b[1]-a[1])*k,y:a[2]+(b[2]-a[2])*k,z:a[3]+(b[3]-a[3])*k,yaw};
}
const ridePose=new RidePose(state);let riderCrouch=0,riderBank=0;
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
for(const b of document.querySelectorAll('[data-mode]')){b.setAttribute('aria-pressed',String(b.classList.contains('selected')));b.onclick=()=>{mode=b.dataset.mode;activeSand=null;updateEnvironment();document.querySelectorAll('[data-mode]').forEach(v=>{v.classList.toggle('selected',v===b);v.setAttribute('aria-pressed',String(v===b));});};}
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
$('daily').onclick=()=>{$('remix-level').value='';$('remix-level').onchange();$('terrain-map').value='';$('terrain-map').onchange();physicsMode='classic';$('physics-mode').value='classic';$('physics-mode').onchange();mode='daily';activeSand=null;updateEnvironment();document.querySelectorAll('[data-mode]').forEach(v=>{v.classList.remove('selected');v.setAttribute('aria-pressed','false');});laps=1;start();};
function toast(text,duration=2){$('toast').textContent=text;toastTime=duration;}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;}
function refreshMenuBest(){
 const el=$('menu-best');if(!el)return;
 let best=Infinity;try{best=Number(localStorage.getItem('dust-valley-best'))||Infinity;}catch{}
 if(!isFinite(best)){el.hidden=true;return;}
 el.hidden=false;el.querySelector('b').textContent=formatTime(best)+(isFinite(bestLap)?` · LAP ${formatTime(bestLap)}`:'');
}
refreshMenuBest();
const lightEls=[...document.querySelectorAll('#lights i')];
function setLights(lit,go=false){lightEls.forEach((el,i)=>{el.classList.toggle('on',!go&&lit>i);el.classList.toggle('go',go);});}
function highlight(){gates.forEach((g,i)=>{g.mat.color.set(i===nextGate?'#e4ff69':'#e4d8b2');g.mat.emissive.set(i===nextGate?'#556500':'#000000');});}
// Each wild terrain paints its own world-space colour map once, then reuses it.
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
  const key=`${mode}|${wild?.id??''}|${physicsMode}`;if(key!==environmentKey){environmentKey=key;trackMap.clear();}
  syncView();
  if(!originalTerrainTextures)sandSurface.material.map=groundMap();syncSandOption();
  tireTracks.clear();
  trackObjects.visible=mode!=='free';tyreStacks.visible=mode!=='free';jumpMarkers.visible=mode==='free'&&!previewHeight&&!wild;materials.dirt.map=groundMap();
  for(let i=0;i<pos.count;i++)pos.setY(i,terrain(pos.getX(i),pos.getZ(i)));
  pos.needsUpdate=true;groundGeo.computeVertexNormals();groundGeo.computeBoundingSphere();sandSurface.update(activeSand?.isGpuSand?null:activeSand);
  gates.forEach(g=>{g.group.position.y=terrain(g.p.x,g.p.z);});
  let marker=0;
  for(let i=0;i<160;i++){const p=track(i/160*TAU);for(const side of [-1,1]){const x=p.x+p.tz*11*side,z=p.z-p.tx*11*side;stakes.setMatrixAt(marker++,stakeMatrix.makeTranslation(x,terrain(x,z)+.6,z));}}
  stakes.instanceMatrix.needsUpdate=true;stakes.computeBoundingSphere();
  tyreParts.forEach(t=>{t.position.y=terrain(t.position.x,t.position.z)+t.userData.groundOffset;});
  for(const child of [...tyreStacks.children]){tyreStacks.remove(child);child.geometry.dispose();}
  batchMeshes(tyreParts,tyreStacks);
  mountains.forEach(groundMountain);rebuildMountainBatches();
  placeBoulders();placeHeroRocks();placeGrass();arch.position.y=terrain(arch.position.x,arch.position.z);groundDetail.update(state.x,state.z,true);
  decorations.forEach(o=>{o.position.y=terrain(o.position.x,o.position.z)+o.userData.groundOffset;o.visible=mode==='free'?!freeClear(o.position.x,o.position.z):!o.userData.onTrack;});
  rebuildDecorationBatches();
  const original=!!previewHeight;
  for(const object of [...mountainBatches,...decorationBatches,boulderMesh,heroGroup,arch,grassMesh,groundDetail.pebbles,groundDetail.scrub])object.visible=!original;
  if(wild&&!original){const show=wild.scenery;mountainBatches.forEach(o=>o.visible=show.buttes);decorationBatches.forEach(o=>o.visible=show.decorations);boulderMesh.visible=show.boulders;grassMesh.visible=show.grass;arch.visible=show.arch;heroGroup.visible=false;groundDetail.pebbles.visible=groundDetail.scrub.visible=show.groundDetail!==false;}
  const rgb=original?coreScene.sceneSettings?.fogColor:null;
  originalFogColor=rgb?new THREE.Color().setRGB(...rgb.map(v=>v/255),THREE.SRGBColorSpace):null;
  scene.fog.color.set(originalFogColor??activeLight()?.fog??timePresets[settings.time]?.fog??timePresets.dawn.fog);
  document.querySelector('.gate-stat').hidden=mode==='free';
}
async function start(){
 if(starting)return;starting=true;
 remix?.dispose();remix=$('remix-level').value?new RemixWorld($('remix-level').value):null;physicsMode=remix?'classic':$('physics-mode').value;if(remix)mode='free';$('remix-choice').hidden=true;
 wild=!remix&&$('terrain-map').value?terrainMap($('terrain-map').value):null;if(wild){physicsMode='classic';mode='free';}
 const startButton=$('start'),startLabel=startButton.innerHTML;startButton.disabled=true;
 try{
 if(physicsMode==='mcm-preview'){startButton.textContent='LOADING ORIGINAL PHYSICS…';corePreview??=await import('./mcm-core-preview.js');coreScene=await loadSelectedMcmMap(await corePreview.loadMcmCoreScene());coreScene.particleAssets=await loadMcmParticleAssets();recoveredParticles.setAssets(coreScene.particleAssets);if(coreScene.mapId==='quarries-dunes')coreScene.worldFiles=await corePreview.loadMcmWorldScene();if(!originalModels){const assets=await loadMcmOriginalModels();originalModels=createMcmOriginalModels(assets);opponentModels=createMcmOriginalModels(assets);opponentModels.root.name='mcm-opponent-models';scene.add(originalModels.root,opponentModels.root);}}
 }
 catch(error){console.error(error);toast('Original physics could not load. Please try again.',5);return;}
 finally{starting=false;startButton.disabled=false;startButton.innerHTML=startLabel;}

 tireTracks.clear();
 laps=mode==='daily'?1:3;
 // Full-terrain sand flow on the GPU for wild maps with erodible sand.
 // Every wild map gets the GPU terrain field (shadows); only erodible sand flows.
 if(wild&&$('sand-mode').checked){sandFlow??=new SandFlowGPU(renderer,{size:mobile?512:1024});const map=wild;sandFlow.reset(map.height,(x,z,h,slope)=>(map.flow?.depth??0)*(map.sand?.(x,z,h,slope)??0));}else sandFlow?.disable();
 const flowHeight=sandFlow?.enabled?(x,z)=>wild.height(x,z)+sandFlow.offsetAt(x,z):null;
 // GPU sand: a 25 cm field that scrolls with the bike carries ripples, ruts and
 // berms; physics rides it through a readback-backed surface.
 gpuSand=null;
 if(sandFlow?.enabled&&debugParams.get('gpusand')!=='0'){
  fineSand??=new FineSandGPU(renderer,{size:mobile?256:512});
  fineSand.reset(trackTexture,{wind:wild.view.wind,ripples:(wild.view.ripple??0)>0,maxDepth:wild.soil.maxDepth,maxLift:wild.soil.maxLift});
  if(!fineMesh){fineMesh=createFineSandMesh(fineSand,{albedo:'#e2c79e',soilMap:wildTexture(wild)});scene.add(fineMesh.mesh);}
  fineMesh.soil.value=wildTexture(wild);fineMesh.albedo.value.set(wild.view.sandColor??'#e2c79e');
  gpuSand=new GpuSandSurface(fineSand,(x,z)=>sandFlow.heightAt(x,z),{soil:wild.soil,flipRows:sandFlow.flipRows});
 }
 const spawnPoint=track(0),spawn=wild?wild.spawn:mode==='free'?{x:0,z:0,yaw:0}:{x:spawnPoint.x,z:spawnPoint.z,yaw:Math.atan2(spawnPoint.tx,spawnPoint.tz)};
 state=remix?createState({physicsMode:'classic',sand:false,flat:true,customWorld:true,height:remix.height,spawn:remix.spawn}):physicsMode==='mcm-preview'?corePreview.createMcmCoreState(coreScene,{spawn,sand:$('sand-mode').checked}):createState({physicsMode,sand:$('sand-mode').checked,...(mode==='free'?{height:flowHeight??freeHeight,spawn}:{}),...(wild?{soil:wild.soil,heroRocks:false,sandTiles:mobile?192:512}:{}),...(gpuSand?{sandSurface:gpuSand}:{})});
 trackMap.clear();sandFx.clear();if(state.physics?.sand&&physicsMode!=='mcm-preview')state.physics.sand.onCells=(cells,sand)=>{trackMap.observe(cells,sand);if(sandFlow?.enabled&&!sand.isGpuSand)sandFlow.observe(cells,sand);};
 soilUniforms.sandAlbedoOn.value=gpuSand?1:0;soilUniforms.sandAlbedo.value.set(wild?.view.sandColor??'#e2c79e');if(gpuSand)soilUniforms.rippleStrength.value=0;if(fineMesh)fineMesh.mesh.visible=!!gpuSand;
 soilUniforms.flowEnabled.value=sandFlow?.enabled?1:0;soilUniforms.shadowEnabled.value=sandFlow?.enabled?1:0;if(sandFlow?.enabled){soilUniforms.flowTexel.value=1/sandFlow.n;soilUniforms.terrainShadow.value=sandFlow.shadowTarget.texture;sandFlow.shadowClock=1;sandFlow.shadows(sunDir,0);}
 if(wild)sandFx.setLook({...wild.view.spray,wind:wild.view.wind});
 updateOriginalTerrainMaterials();
 previewHeight=state.physicsBackend==='recovered-core'?state.physics.baseHeight:null;
 activeSand=state.physics?.renderSurface||state.physics?.sand||null;sandSurface.update(activeSand?.isGpuSand?null:activeSand);updateEnvironment();if(remix)remix.attach(state,scene);$('remix-hud').hidden=!remix;$('remix-action').hidden=remix?.id!=='giant';if(remix)$('remix-title').textContent=remix.spec.name;document.querySelector('.map-panel>span').textContent=remix?'REMIX / LIVE':wild?wild.name.toUpperCase()+' / LIVE':'REDROCK / LIVE';
 $('preview-badge').hidden=physicsMode!=='mcm-preview';
 $('preview-badge').textContent='MOTOCROSS MADNESS · RECOVERED';
 document.body.classList.toggle('mcm-preview',physicsMode==='mcm-preview');
 document.querySelector('.ride-hint').textContent=physicsMode==='mcm-preview'?'WASD ride · I / K rider lean · R recover':'WASD ride · SPACE boost · I / K rider lean · R recover';
 ridePose.reset(state);if(state.physicsBackend==='recovered-core')originalModels?.reset(state);if(state.opponents?.[0])opponentModels?.reset(state.opponents[0]);riderCrouch=0;riderBank=0;elapsed=0;lap=1;nextGate=1;score=0;lapStart=0;combo=0;comboTimer=0;wrongTime=0;shake=0;
 ghostRecord=[];ghostClock=0;activeGhost=physicsMode==='classic'?ghostBest:null;ghostBike.visible=false;countdown=mode==='free'?-.75:3;lastCountdownBeep=4;cameraReady=false;accumulator=0;clearInput();
 document.body.classList.add('playing');for(const id of ['menu','location','footer','overlay','tutorial'])$(id).hidden=true;for(const id of ['hud','pause'])$(id).hidden=false;$('touch').hidden=!mobile;
 $('lap-label').textContent=remix?'REMIX LAP':mode==='free'?'STUNT SCORE':'LAP';$('resume').hidden=false;$('wrong').hidden=true;$('combo').hidden=true;$('share').hidden=true;$('leaderboard').hidden=true;
 highlight();
 // Compile every pipeline up front (spray, clods and dust included) so first
 // appearances do not hitch mid-ride.
 {const spray=sandFx.root.visible;sandFx.root.visible=true;renderer.compileAsync(scene,camera).catch(()=>{}).finally(()=>{sandFx.root.visible=spray;});}
 if(!readSetting('dust-valley-tutorial','')){
  phase='tutorial';$('tutorial').hidden=false;$('lights').hidden=true;
 }else{phase='playing';$('lights').hidden=mode==='free';setLights(3,false);if(mode==='daily')beginDaily();}
}
$('tutorial-start').onclick=()=>{writeSetting('dust-valley-tutorial','1');$('tutorial').hidden=true;phase='playing';countdown=mode==='free'?-.75:3;lastCountdownBeep=4;$('lights').hidden=mode==='free';setLights(3,false);cameraReady=false;if(mode==='daily')beginDaily();};
$('start').onclick=start;$('restart').onclick=start;$('reset').onclick=()=>{if(phase==='playing')recover();};
function recover(){if(remix){const p=remix.recovery();resetBike(state,p.x,p.z,p.yaw);ridePose.reset(state);remix.lastTrail=null;accumulator=0;cameraReady=false;tireTracks.breakTrail();toast('BACK TO THE LAST CHECKPOINT');return;}if(state.physicsBackend==='recovered-core'){const {scene,spawn,sand}=state.physics;state=corePreview.createMcmCoreState(scene,{spawn,sand:!!sand});updateOriginalTerrainMaterials();activeSand=state.physics.renderSurface;previewHeight=state.physics.baseHeight;ridePose.reset(state);originalModels?.reset(state);if(state.opponents?.[0])opponentModels?.reset(state.opponents[0]);accumulator=0;cameraReady=false;tireTracks.clear();sandSurface.update(activeSand?.isGpuSand?null:activeSand);toast('BACK TO START');return;}tireTracks.breakTrail();combo=0;comboTimer=0;wrongTime=0;$('combo').hidden=true;if(mode==='free'){const radius=Math.hypot(state.x,state.z),scale=radius>380?380/radius:1;resetBike(state,state.x*scale,state.z*scale,state.yaw);ridePose.reset(state);accumulator=0;cameraReady=false;toast('BACK ON THE DIRT');return;}const g=gates[(nextGate+11)%12];resetBike(state,g.p.x,g.p.z,g.yaw);ridePose.reset(state);accumulator=0;cameraReady=false;toast('BACK ON THE DIRT');}
function togglePause(){if(phase==='playing'){phase='paused';clearInput();$('overlay').hidden=false;$('overlay-label').textContent='TAKE A BREATHER';$('overlay-title').textContent='Ride paused.';$('overlay-copy').textContent='The desert isn’t going anywhere.';$('resume').hidden=false;$('photo').hidden=false;}else if(phase==='paused'){phase='playing';$('overlay').hidden=true;}}$('pause').onclick=togglePause;$('resume').onclick=togglePause;
$('home').onclick=()=>{sandFlow?.disable();fineSand?.disable();gpuSand=null;if(fineMesh)fineMesh.mesh.visible=false;soilUniforms.sandAlbedoOn.value=0;soilUniforms.flowEnabled.value=0;soilUniforms.shadowEnabled.value=0;remix?.dispose();remix=null;physicsMode=$('physics-mode').value;activeSand=null;previewHeight=null;$('remix-hud').hidden=true;$('remix-choice').hidden=true;updateEnvironment();$('preview-badge').hidden=true;document.body.classList.remove('mcm-preview');phase='menu';clearInput();document.body.classList.remove('playing');if(mode==='daily'){mode='race';updateEnvironment();}for(const id of ['menu','location','footer'])$(id).hidden=false;for(const id of ['hud','pause','touch','overlay','lights'])$(id).hidden=true;ghostBike.visible=false;refreshMenuBest();updateDailyButton();};
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function readTimes(key){try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?v.filter(Number.isFinite):[];}catch{return [];}}
function addTime(key,time){const list=[...readTimes(key),time].sort((a,b)=>a-b).slice(0,5);try{localStorage.setItem(key,JSON.stringify(list));}catch{}return list;}
function renderLeaderboard(key){
 const list=readTimes(key),el=$('leaderboard');if(!list.length){el.hidden=true;return;}
 el.hidden=false;el.innerHTML='<div><span>LOCAL TOP 5</span><b>'+formatTime(list[0])+'</b></div>'+list.slice(0,5).map((t,i)=>`<div><span>${i+1}</span><b>${formatTime(t)}</b></div>`).join('');
}
function updateDailyButton(){
 const best=readTimes(`dust-valley-daily-times-${todayKey()}`)[0];
 const el=$('daily');if(el)el.innerHTML=`DAILY SPRINT <span>${best?`1 LAP · BEST ${formatTime(best)}`:'1 LAP · TODAY’S RUN ↗'}</span>`;
}
function beginDaily(){laps=1;updateDailyButton();}
function shareResult(isDaily){
 const c=document.createElement('canvas');c.width=1200;c.height=630;const g=c.getContext('2d');
 g.fillStyle='#16251e';g.fillRect(0,0,1200,630);
 g.fillStyle='#e7fb7a';g.fillRect(70,70,64,64);g.fillStyle='#203126';g.font='bold 40px Arial';g.fillText('↗',88,118);
 g.fillStyle='#f7f4e8';g.font='bold 28px Arial';g.letterSpacing='4px';g.fillText('DUST VALLEY',160,114);
 g.fillStyle='#e7fb7a';g.font='bold 58px Arial';g.fillText(isDaily?'DAILY SPRINT':'THREE LAPS',70,260);
 g.fillStyle='#f7f4e8';g.font='bold 150px Arial';g.fillText(formatTime(elapsed),70,430);
 g.fillStyle='#c6d1be';g.font='24px Arial';g.fillText(`BEST LAP ${isFinite(bestLap)?formatTime(bestLap):'—'}   ·   STUNT ${score}`,72,500);
 g.fillStyle='#9eaf9a';g.font='18px Arial';g.fillText('rnaud.github.io/dust-valley-motocross',72,575);
 c.toBlob(blob=>{
  if(!blob)return;const file=new File([blob],'dust-valley.png',{type:'image/png'});
  const download=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='dust-valley.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
  if(mobile&&navigator.canShare?.({files:[file]})){navigator.share({files:[file],title:'Dust Valley',text:'Ride result'}).catch(download);}
  else download();
 },'image/png');
}
function finishRemix(){
 phase='finished';clearInput();accumulator=0;$('overlay').hidden=false;$('overlay-label').textContent=remix.spec.name.toUpperCase();$('overlay-title').textContent=remix.result.won?'Remix complete.':'Give it another run.';$('overlay-copy').textContent=remix.result.text+` Time ${formatTime(remix.time)}.`;for(const id of ['resume','photo','share','leaderboard'])$(id).hidden=true;
}
function showRemixChoice(){
 phase='remix-choice';clearInput();accumulator=0;$('remix-choice').hidden=false;$('remix-sectors').replaceChildren();remix.sectors.forEach((sector,i)=>{const button=document.createElement('button');button.className='primary';button.textContent=`SECTOR ${i+1} · ${sector.locked?'LOCKED':sector.tune>.55?'JUMPS':'TIGHT CORNERS'}`;button.disabled=sector.locked;button.onclick=()=>{if(remix.lockSection(i)){$('remix-choice').hidden=true;phase='playing';}};$('remix-sectors').append(button);});
}
function finish(){
 if(physicsMode==='mcm-preview'){
  phase='finished';clearInput();$('overlay').hidden=false;$('overlay-label').textContent='RIDE COMPLETE';$('overlay-title').textContent='Ride complete.';
  $('overlay-copy').textContent=`Time ${formatTime(elapsed)}. Results are separate from the legacy circuit leaderboard.`;
  $('resume').hidden=true;$('leaderboard').hidden=true;$('share').hidden=true;return;
 }

 phase='finished';clearInput();
 const isDaily=mode==='daily';
 const lapTime=elapsed-lapStart;
 if(physicsMode==='classic'&&lapTime<bestLap){
  bestLap=lapTime;try{localStorage.setItem('dust-valley-best-lap',String(bestLap));}catch{}
  if(ghostRecord.length>10){ghostRecord.push([lapTime,state.x,state.y+.5,state.z,state.yaw]);activeGhost=ghostRecord;ghostBest=ghostRecord;try{localStorage.setItem('dust-valley-ghost',JSON.stringify(ghostRecord));}catch{}}
 }
 const bestKey=isDaily?`dust-valley-daily-${todayKey()}`:'dust-valley-best';
 let previousBest=Infinity;try{previousBest=Number(localStorage.getItem(bestKey))||Infinity;if(elapsed<previousBest)localStorage.setItem(bestKey,String(elapsed));}catch{}
 const timesKey=isDaily?`dust-valley-daily-times-${todayKey()}`:'dust-valley-times';
 addTime(timesKey,elapsed);renderLeaderboard(timesKey);
 $('overlay').hidden=false;$('overlay-label').textContent=isDaily?'ONE LAP. TODAY.':'THREE LAPS. ALL DUST.';$('overlay-title').textContent=isDaily?(elapsed<previousBest?'Daily best.':'Daily done.'):'Nicely ridden.';
 $('overlay-copy').textContent=`Time ${formatTime(elapsed)} · Best lap ${isFinite(bestLap)?formatTime(bestLap):'—'} · Stunt score ${score}. ${elapsed<previousBest?'New personal best!':`Best ${formatTime(previousBest)}`}`;
 $('resume').hidden=true;$('photo').hidden=true;$('share').hidden=false;$('share').onclick=()=>shareResult(isDaily);
 updateDailyButton();refreshMenuBest();
}
const mapCtx=$('map').getContext('2d');function drawMap(){
  const ctx=mapCtx;ctx.clearRect(0,0,180,150);
  if(remix){const p=remix.target();ctx.fillStyle='#e7fb7a';ctx.beginPath();ctx.arc(90+Math.max(-75,Math.min(75,(p.x-state.x)*.6)),75-Math.max(-60,Math.min(60,(p.z-state.z)*.6)),5,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.font='11px Arial';ctx.textAlign='center';ctx.fillText('NEXT CHECKPOINT',90,145);ctx.save();ctx.translate(90,75);ctx.rotate(state.yaw);ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,4);ctx.lineTo(4,4);ctx.closePath();ctx.fill();ctx.restore();return;}

  if(mode==='free'){
    // A local compass replaces the race route and next-checkpoint marker.
    ctx.strokeStyle='#e5e0ca44';ctx.lineWidth=1;ctx.beginPath();ctx.arc(90,75,54,0,TAU);ctx.stroke();
    ctx.fillStyle='#e7fb7a';ctx.font='11px Arial';ctx.textAlign='center';ctx.fillText('N',90,15);
    ctx.save();ctx.translate(90,75);ctx.rotate(-state.yaw);
    for(const j of wild?[]:jumps){
     const dx=j.x-state.x,dz=j.z-state.z,dist=Math.hypot(dx,dz);
     if(dist<260){ctx.fillStyle=dist<45?'#e7fb7a':'#e7fb7a99';ctx.beginPath();ctx.arc(dx*.35,-dz*.35,dist<45?3:2,0,TAU);ctx.fill();}
    }
  }else{
    const mx=x=>90+x*.4,mz=z=>75+z*.4;ctx.beginPath();
    for(let i=0;i<=100;i++){const p=track(i/100*TAU);i?ctx.lineTo(mx(p.x),mz(p.z)):ctx.moveTo(mx(p.x),mz(p.z));}
    ctx.strokeStyle='#e5e0ca66';ctx.lineWidth=7;ctx.stroke();const p=gates[nextGate].p;
    ctx.fillStyle='#e7fb7a';ctx.beginPath();ctx.arc(mx(p.x),mz(p.z),4,0,TAU);ctx.fill();
    ctx.save();ctx.translate(mx(state.x),mz(state.z));ctx.rotate(-state.yaw);
  }
  ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(-4,-4);ctx.lineTo(4,-4);ctx.closePath();ctx.fill();ctx.restore();
}
function drawSpeedLines(){
 if(!speedCtx)return;const w=speedCanvas.width,h=speedCanvas.height;speedCtx.clearRect(0,0,w,h);
 if(phase!=='playing'||countdown>0)return;
 const kmh=state.speed*3.6,boosting=input.boost&&state.boost>0&&input.gas;
 const k=Math.max(0,Math.min(1,(kmh-58)/90))*.5+(boosting?.18:0);
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
if(settings.quality==='auto'&&!autoDowngraded&&phase==='playing'&&countdown<=0){
 perfTime+=dt;perfFrames++;
 if(perfTime>6){if(perfFrames/perfTime<48){autoDowngraded=true;applyQuality('low');toast('QUALITY · ADAPTED TO THIS DEVICE',2.4);}perfTime=0;perfFrames=0;}
}
impactFlash=Math.min(1,Math.max(0,impactFlash-dt*2.8));if($('impact'))$('impact').style.opacity=(impactFlash*.62).toFixed(2);drawSpeedLines();
const helmetView=settings.camera==='helmet'&&(phase==='playing'||phase==='paused');
const showBike=!helmetView&&(phase!=='menu'||camera.aspect>0.95);bike.visible=showBike;wheels.forEach(w=>w.visible=showBike);forks.forEach(f=>f.visible=showBike&&!retroOn);retroForks.forEach(f=>f.visible=showBike&&retroOn);frontFender.visible=showBike&&!retroOn;retro.frontFender.visible=showBike&&retroOn;
if(phase==='playing'){
 if(countdown>0){
  countdown-=dt;const lit=Math.max(0,Math.min(3,Math.ceil(countdown)));setLights(lit,false);
  if(lit!==lastCountdownBeep&&lit>0){rideAudio.beep(480+lit*55,.08,.05);lastCountdownBeep=lit;}
  if(countdown<=0){toast('SEND IT',.9);setLights(3,true);rideAudio.beep(940,.18,.06);}
 }else{
  if(countdown>-0.75){countdown-=dt;if(countdown<=-0.75)$('lights').hidden=true;}
  elapsed+=dt;accumulator+=dt;
  while(accumulator>=simulationStep()){
   let result;
   try{remix?.beforeStep(simulationStep(),input,state);result=state.physicsBackend==='recovered-core'?corePreview.stepMcmCoreState(state,input,simulationStep()):stepBike(state,input,simulationStep());}
   catch(error){console.error(error);state.physicsError=error.message;phase='paused';clearInput();$('overlay').hidden=false;$('overlay-label').textContent='PHYSICS STOPPED';$('overlay-title').textContent='Recovered physics stopped.';$('overlay-copy').textContent='This riding path reached an unresolved original dependency. Restart to ride again.';$('resume').hidden=true;break;}
   rideAudio.step(state,input,simulationStep(),camera.position);
   ridePose.push(state);if(state.physicsBackend==='recovered-core')originalModels?.push(state);if(state.opponents?.[0])opponentModels?.push(state.opponents[0]);// On wild sand the trenches themselves are the tracks; skip the tread decals.
   tireTracks.update(state.crashed||(wild&&state.physics.sand)?[]:state.wheelContacts,surfaceHeight);
   if(result.landed>.5){
    impactFlash=Math.max(impactFlash,result.crashed?1:.28);
    puff(state.x,state.y-.3,state.z,result.crashed?18:12,1.05,1.2);shake=reduceMotion?0:Math.max(shake,Math.min(.3,result.landed*.035));if(state.physicsBackend!=='recovered-core')rideAudio.land(Math.min(1,result.landed));if(reduceMotion)shake=0;
    if(result.crashed){combo=0;comboTimer=0;toast('WIPEOUT · R OR ↺ TO RECOVER',3);}
    else{
     combo=comboTimer>0?combo+1:1;comboTimer=5;
     const points=Math.round(result.landed*100*combo);score+=points;
     toast(combo>1?`AIR +${points} · ×${combo}`:`AIR TIME +${points}`);
    }
   }
   accumulator-=simulationStep();
   if(remix){remix.afterStep(state);if(remix.resetPose){remix.resetPose=false;ridePose.reset(state);cameraReady=false;tireTracks.breakTrail();toast('LAP TWO · ONLY YOUR INK REMAINS',3);}if(remix.result){finishRemix();break;}if(remix.choicePending){showRemixChoice();break;}}

  }
  if(mode!=='free'&&physicsMode==='classic'){
   ghostClock+=dt;
   if(ghostClock>=.1){ghostClock=0;ghostRecord.push([elapsed-lapStart,state.x,state.y+.5,state.z,state.yaw]);if(ghostRecord.length>6000)ghostRecord.shift();}
  }
  if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=0;}
  $('combo').hidden=combo<2;$('combo').textContent=combo>1?`×${combo}`:'';
  if(mode!=='free'){
   const near=nearestTrack(state.x,state.z),trackYaw=Math.atan2(near.tx,near.tz);
   if(state.speed>5&&near.distance<18&&Math.cos(state.yaw-trackYaw)<-.2)wrongTime+=dt;else wrongTime=0;
   $('wrong').hidden=wrongTime<.7;
  }else{$('wrong').hidden=true;wrongTime=0;}
  if(!remix&&Math.hypot(state.x,state.z)>400){recover();toast('BACK TO THE BASIN');}
  if(mode!=='free'){
   const p=gates[nextGate].p;
   if(Math.hypot(state.x-p.x,state.z-p.z)<12){
    const lapTime=elapsed-lapStart;
    if(nextGate===0){
     if(physicsMode==='classic'&&lapTime<bestLap){
      bestLap=lapTime;try{localStorage.setItem('dust-valley-best-lap',String(bestLap));}catch{}
      if(ghostRecord.length>10){ghostRecord.push([lapTime,state.x,state.y+.5,state.z,state.yaw]);activeGhost=ghostRecord;ghostBest=ghostRecord;try{localStorage.setItem('dust-valley-ghost',JSON.stringify(ghostRecord));}catch{}}
     }
     ghostRecord=[];ghostClock=0;
     lap++;
     if(lap>laps)finish();
     else{toast(`LAP ${lap} / ${laps} · ${formatTime(lapTime)}`,2.2);lapStart=elapsed;rideAudio.beep(520,.18,.05);}
    }else{toast(`GATE ${nextGate} / 12 · ${formatTime(elapsed)}`,1.1);rideAudio.beep(760,.06,.035);}
    nextGate=(nextGate+1)%12;highlight();
   }
  }
 }
 if(state.crashed)toast('WIPEOUT · R OR ↺ TO RECOVER',1);
 toastTime-=dt;if(toastTime<=0)$('toast').textContent='';
}
if(remix){remix.updateVisuals();$('remix-status').textContent=remix.status();$('remix-action').disabled=remix.awake;$('remix-action').textContent=remix.awake?'GIANT AWAKE':mobile?'WAKE THE GIANT':'WAKE THE GIANT · E';}
const renderAlpha=phase==='playing'?accumulator/simulationStep():1;
const visual=ridePose.sample(renderAlpha);
// The MCM preview particles are GLSL ShaderMaterials, unsupported by WebGPURenderer.
recoveredParticles.root.visible=false;
dust.visible=state.physicsBackend!=='recovered-core'&&settings.quality!=='low'&&!autoDowngraded;
const showOriginal=phase!=='menu'&&state.physicsBackend==='recovered-core'&&!!originalModels;
bike.visible=showBike&&!showOriginal;wheels.forEach(w=>w.visible=showBike&&!showOriginal);forks.forEach(p=>p.visible=showBike&&!showOriginal&&!retroOn);retroForks.forEach(p=>p.visible=showBike&&!showOriginal&&retroOn);frontFender.visible=showBike&&!showOriginal&&!retroOn;retro.frontFender.visible=showBike&&!showOriginal&&retroOn;
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
ghostBike.visible=false;
if(mode==='race'&&phase==='playing'&&countdown<=0&&activeGhost){
 const gp=sampleGhost(elapsed-lapStart);
 if(gp){ghostBike.visible=true;ghostBike.position.set(gp.x,gp.y,gp.z);ghostBike.rotation.set(0,gp.yaw,0);}
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
if(phase==='menu'){const p=track(0);state.x=p.x;state.z=p.z;state.y=terrain(p.x,p.z)+.8;state.yaw=-.15;state.pitch=0;camera.position.set(p.x+19+Math.sin(total*.07)*3,p.y||terrain(p.x,p.z)+8,p.z+18);camera.lookAt(p.x-9,2,p.z-10);}
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
if(phase==='menu'){
 wheels.forEach(w=>w.scale.setScalar(1));
 bike.position.set(state.x,state.y+.5,state.z);bike.rotation.set(0,state.yaw,0);bike.updateMatrixWorld(true);
 wheels.forEach((w,i)=>{w.position.copy(bike.localToWorld(new THREE.Vector3(0,-.45,i?1.1:-1.05)));w.quaternion.copy(bike.quaternion);});
}else{
 bike.position.copy(visual.position);bike.quaternion.copy(visual.quaternion);
 wheels.forEach((w,i)=>{w.scale.setScalar((state.visualWheelRadii?.[i]??.61)/.61);const t=visual.wheels[i];w.position.copy(t.position);w.quaternion.copy(t.quaternion);});
 if(state.throttle>0&&state.contacts&&!state.air){const slip=Math.max(0,Math.min(.8,state.slipRatio?.[0]||0));if(slip>.02)wheels[0].quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),slip*dt*45));}
 const flaring=physicsMode!=='mcm-preview'&&input.gas&&input.boost&&state.boost>0&&!state.crashed;
 boostFlame.visible=flaring;boostGlow.visible=flaring;if(flaring){boostFlame.material.opacity=.55+Math.random()*.3;boostFlame.scale.setScalar(.8+Math.random()*.5);boostGlow.material.opacity=.18+Math.random()*.16;boostGlow.scale.setScalar(.45+Math.random()*.25);}
}
// Wheel spin leaves its axle unchanged. Build the steering assembly from that
// actual axle so fork feet, fender and bars all agree with the steered wheel.
steeringRotation(bike.quaternion,wheels[1].quaternion,frontRotation);
frontUp.set(0,1,0).applyQuaternion(frontRotation);
frontForward.set(0,0,1).applyQuaternion(frontRotation);
handlebar.quaternion.copy(bike.quaternion).invert().multiply(frontRotation);
frontFender.quaternion.copy(frontRotation);
frontFender.position.copy(wheels[1].position).addScaledVector(frontUp,.62).addScaledVector(frontForward,.1);
if(retroOn){retro.frontFender.position.copy(frontFender.position);retro.frontFender.quaternion.copy(frontRotation);}
const poseBlend=1-Math.exp(-dt*10);
if(phase==='playing'){riderCrouch+=(Math.max(...visual.compression)-riderCrouch)*poseBlend;riderBank+=(visual.roll-riderBank)*poseBlend;}
const riderPose={compression:riderCrouch,bank:riderBank,steer:visual.steer,gripQuaternion:handlebar.quaternion,lean:input.lean ?? ((input.leanBack?1:0)-(input.leanForward?1:0)),speed:visual.speed};
(retroOn?retro.rider:rider).update(riderPose);
bike.updateMatrixWorld(true);
const linkage=bikeLinkagePoints(bike.position,bike.quaternion,wheels[0],wheels[1]);
(retroOn?retroForks:forks).forEach((part,i)=>fitBikeLink(part,linkage[i].start,linkage[i].end));


sun.position.set(state.x+sunOffset.x,state.y+sunOffset.y,state.z+sunOffset.z);sun.target.position.set(state.x,state.y,state.z);soilUniforms.sunDir.value.copy(sunDir);skyUniforms.time.value+=dt;
if(gpuSand&&state.physics.sand===gpuSand&&phase==='playing'){
 fineSand.update(dt);fineMesh.update();if(((animate.frame=(animate.frame??0)+1)%3)===0)gpuSand.sync();
}
if(sandFlow?.enabled&&phase==='playing'){
 sandFlow.update(dt);soilUniforms.flowField.value=sandFlow.texture;if(debugParams.get('shadowpass')!=='0')sandFlow.shadows(sunDir,dt);
 // Avalanches near the bike feed back into the 25 cm physics/render patch.
 if((flowReadClock+=dt)>.2&&!sandFlow.reading){flowReadClock=0;const sand=state.physics.sand;sandFlow.readAround(state.x,state.z).then(changed=>{
  if(!changed?.length||state.physics.sand!==sand)return;const n=sandFlow.n,dx=sandFlow.dx;
  for(const c of changed){const x=-450+(c%n+.5)*dx,z=-450+(Math.floor(c/n)+.5)*dx;for(const ox of [-dx,dx])for(const oz of [-dx,dx])sand.dirty.add(`${Math.floor((x+ox)/16)},${Math.floor((z+oz)/16)}`);}
 }).catch(()=>{});}
}
const sprayOn=!!(wild&&state.physics?.sand&&phase!=='menu');sandFx.root.visible=sprayOn;
if(sprayOn&&phase==='playing'){const sand=state.physics.sand;sandFx.update(dt,{soil:sand.profile,contacts:countdown<=0&&!state.crashed?state.wheelContacts:[],velocity:state.physics.chassis.velocity,throttle:state.throttle,events:sand.events.splice(0),height:(x,z)=>sand.height(x,z),deposit:(x,z,volume)=>sand.deposit(x,z,volume)},camera);}
if(!sprayOn&&state.physicsBackend!=='recovered-core'&&phase==='playing'&&state.speed>4&&!state.air&&countdown<=0){
  const back=1.05;
  puff(state.x-Math.sin(state.yaw)*back,state.y-.55,state.z-Math.cos(state.yaw)*back,input.boost?3:2,.3,.7);
}
for(let i=0;i<moteCount;i++){const m=moteBase[i];motePos[i*3]=camera.position.x+m.x+Math.sin(total*.13+m.phase)*1.2;motePos[i*3+1]=camera.position.y-1+m.y+Math.cos(total*.09+m.phase)*.35;motePos[i*3+2]=camera.position.z+m.z+Math.cos(total*.11+m.phase)*1.2;}motePoints.update();
particles.forEach((p,i)=>{p.life-=dt*.62;if(p.life>0){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vx*=1-dt*1.4;p.vz*=1-dt*1.4;p.vy+=.12*dt;}dustPositions[i*3]=p.x;dustPositions[i*3+1]=p.life>0?p.y:-100;dustPositions[i*3+2]=p.z;});dustPoints.update();
rideAudio.update(state,input,phase==='playing'&&countdown<=0);
$('speed').textContent=Math.round(state.speed*3.6);$('time').textContent=formatTime(elapsed);$('lap').innerHTML=remix?`${Math.min(remix.lap,remix.spec.laps)}<span>/${remix.spec.laps}</span>`:mode==='free'?String(score):`${String(Math.min(lap,laps)).padStart(2,'0')}<span>/${String(laps).padStart(2,'0')}</span>`;$('gate').innerHTML=`${String(nextGate===0?12:nextGate).padStart(2,'0')}<span>/12</span>`;$('boost').style.width=state.boost+'%';$('gear').textContent=state.gear||1;$('rpm').style.width=Math.min(100,(state.rpm||1200)/10000*100)+'%';sandSurface.update(activeSand?.isGpuSand?null:activeSand);groundDetail.update(state.x,state.z);sky.position.copy(camera.position);sunGlow.position.copy(camera.position).addScaledVector(sunDir,560);sunCore.position.copy(sunGlow.position);drawMap();gates.forEach(g=>{g.group.visible=phase==='menu'?camera.aspect>0.95:g.group.position.distanceTo(camera.position)>13;});recoveredParticles.update(state,camera,renderAlpha);renderArt();if(!$('loading').hidden)$('loading').hidden=true;}
function resize(){renderer.setSize(innerWidth,innerHeight);if(speedCanvas){speedCanvas.width=innerWidth;speedCanvas.height=innerHeight;}camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();updateDailyButton();
requestAnimationFrame(animate);
// Read-only diagnostics for smoke tests and performance inspection.
// Start on the sand: Sidewinder Dunes unless the rider last chose another terrain.
{const saved=readSetting('dust-valley-terrain','dunes');$('terrain-map').value=saved==='basin'?'':terrainMap(saved)?saved:'dunes';$('terrain-map').onchange();}
window.__game={trackMap,soil:soilUniforms,place:(x,z,yaw)=>{resetBike(state,x,z,yaw);ridePose.reset(state);cameraReady=false;accumulator=0;},backend:()=>rendererBackend,flow:()=>sandFlow?.totals()??null,shadowStats:()=>sandFlow?.shadowStats()??null,sandFx:()=>({dust:sandFx.spray.activeDust,clods:sandFx.spray.activeClods,visible:sandFx.root.visible}),remix:()=>remix?.diagnostics()??null,presentation:()=>({style:artRenderer.style,particles:recoveredParticles.count,nativeParticles:recoveredParticles.nativeCount,particleTexture:recoveredParticles.textureName,particleSprites:[...new Set(recoveredParticles.rows.map(r=>r.sprite))]}),audio:()=>rideAudio.original?.diagnostics()??{ready:false},sandSample:(x,z)=>activeSand?{height:activeSand.height(x,z),displacement:activeSand.displacementAt(x,z),compaction:activeSand.compaction(x,z)}:null,environment:()=>({sand:activeSand?{version:activeSand.version,tiles:activeSand.tiles.size,renderedTiles:sandSurface.meshes.size}:null,trackVisible:trackObjects.visible,trackTexture:materials.dirt.map===textures.macro,height:state.physics.height(state.x,state.z),visualHeight:terrain(state.x,state.z),mountains:mountains.map(m=>({x:m.position.x,z:m.position.z,radius:m.userData.radius*Math.max(m.scale.x,m.scale.z),foundation:m.userData.foundation}))}),snapshot:()=>({phase,mode,elapsed,lap,nextGate,score,countdown,originalAssets:state.physicsBackend==='recovered-core'?{map:coreScene.mapId??'quarries-dunes',rider:$('mcm-rider').value,bike:$('mcm-bike').value,parts:originalModels?.parts,opponentVisible:opponentModels?.root.visible??false,sceneSettings:coreScene.sceneSettings?.source??null,fogColor:coreScene.sceneSettings?.fogColor??null,proceduralScenery:heroGroup.visible,terrainTextures:!!originalTerrainTextures,missingTerrainTextures:originalTerrainTextures?.missing}:null,tireTrackSegments:tireTracks.count,...state}),renderer};
