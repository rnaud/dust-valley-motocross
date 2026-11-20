import * as THREE from 'three';
import {rippleHeight,RIPPLE_WAVELENGTH} from './ripple-seed.js';
import {Fn,dFdx,dFdy,mx_noise_float,clamp as tslClamp,texture as tslTexture,uniform,positionWorld,positionGeometry,normalView,normalWorld,cameraPosition,cameraViewMatrix,fwidth,fract,floor,smoothstep,mix,step,sin,dot,length,normalize,pow,max,select,mod,vec2,vec3,vec4,float,normalMap} from 'three/tsl';
const TAU=Math.PI*2;
// The sky and dust artwork still paint a worn lane; with the circuit gone it is
// a ring around the basin rather than the race course.
const track=a=>({x:Math.sin(a)*260,z:Math.cos(a)*260,tx:Math.cos(a),tz:-Math.sin(a)});

// Seeded value noise: all artwork is generated locally; no downloaded assets.
function hash(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);}
const clamp=THREE.MathUtils.clamp;
function canvas(size){const c=document.createElement('canvas');c.width=c.height=size;return c;}
function texture(c,anisotropy,repeat=1){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=anisotropy;if(repeat!==1){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);}return t;}
function pixels(size,fn){const c=canvas(size),ctx=c.getContext('2d'),image=ctx.createImageData(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const color=fn(x,y);const i=(y*size+x)*4;for(let k=0;k<3;k++)image.data[i+k]=color[k];image.data[i+3]=255;}ctx.putImageData(image,0,0);return c;}

export function createTextures(renderer,mobile){
  const aniso=Math.min(8,renderer.getMaxAnisotropy());
  // A world-space color map gives each part of the basin its own soil and scrub.
  const size=mobile?1024:1536;
  const terrainCanvas=pixels(size,(px,py)=>{
    const x=px/size*900-450,z=py/size*900-450;
    const broad=noise(x*.017+70,z*.017+90),patch=noise(x*.085+10,z*.085+40),fine=noise(x*.42,z*.42);
    const iron=noise(x*.011+31,z*.014+77),region=noise(x*.006+300,z*.008+120);
    const wash=clamp((noise(x*.019+210,z*.006+60)-.55)*3.2,0,1);
    // Sage scrub is sparse in the basin; sun-baked sand and iron-rich clay dominate.
    const scrub=clamp((broad*.5+patch*.5-.56)*4,0,1)*.34;
    const red=clamp((iron-.48)*2.4,0,1)*.4;
    let r=190+patch*32+fine*14+red*24+(region-.5)*26;
    let g=146+patch*26+fine*11-red*9+(region-.5)*11;
    let b=98+patch*19+fine*8-red*11+(region-.5)*5;
    r-=wash*28;g-=wash*20;b-=wash*11;
    r=r+(120-r)*scrub;g=g+(115-g)*scrub;b=b+(80-b)*scrub;
    const gravel=fine*12+hash(px,py)*11;
    return [r+gravel,g+gravel*.9,b+gravel*.7];
  });
  const freeMacro=texture(terrainCanvas,aniso);
  const raceCanvas=canvas(size);raceCanvas.getContext('2d').drawImage(terrainCanvas,0,0);
  // Paint the actual course, including continuous worn lanes and tire grooves.
  const ctx=raceCanvas.getContext('2d');const scale=size/900;
  const path=(offset,width,color)=>{ctx.beginPath();for(let i=0;i<=900;i++){const a=i/900*TAU,p=track(a),q=track(a+.001),l=Math.hypot(q.x-p.x,q.z-p.z);const x=p.x+(q.z-p.z)/l*offset,z=p.z-(q.x-p.x)/l*offset;const px=(x+450)*scale,py=(z+450)*scale;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width*scale;ctx.lineJoin='round';ctx.stroke();};
  path(0,25,'rgba(147,105,66,.28)');path(0,21,'rgba(170,124,80,.62)');path(0,17,'#a97448');path(0,12,'#b98653');
  for(const lane of [-6,-3,0,3,6]){path(lane,1.2,'rgba(70,45,28,.31)');path(lane+.65,.35,'rgba(238,201,151,.4)');}
  // A checkered start/finish band across the full twelve-metre road.
  {
   const p0=track(0),q0=track(.001),l=Math.hypot(q0.x-p0.x,q0.z-p0.z),tx=(q0.x-p0.x)/l,tz=(q0.z-p0.z)/l,nx=tz,nz=-tx,cell=1.2;
   for(let row=0;row<2;row++)for(let col=-5;col<5;col++){
    ctx.fillStyle=(row+col+20)%2?'#e9e2cc':'#26372d';ctx.beginPath();
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){
     const across=(col+u)*cell,along=(row+v)*cell,x=p0.x+nx*across+tx*along,z=p0.z+nz*across+tz*along;
     const px=(x+450)*scale,py=(z+450)*scale;u===0&&v===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill();
   }
  }
  // Break up painted areas with translucent coarse soil, avoiding a flat ribbon.
  const image=ctx.getImageData(0,0,size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;const shade=.82+noise(x*.11,y*.11)*.26+hash(x+50,y)*.1;for(let k=0;k<3;k++)image.data[i+k]*=shade;}
  ctx.putImageData(image,0,0);
  const macro=texture(raceCanvas,aniso);
  const detailCanvas=pixels(256,(x,y)=>{const n=noise(x*.12,y*.12),grain=hash(x,y);const v=135+n*77+grain*42;return [v,v,v];});
  // Wrapped pebble marks retain visible detail at riding-camera distance.
  const detailCtx=detailCanvas.getContext('2d');for(let i=0;i<850;i++){const x=hash(i,3)*256,y=hash(i,7)*256,r=.4+hash(i,9)*1.5;detailCtx.fillStyle=i%4?'rgba(55,47,39,.25)':'rgba(255,245,218,.5)';detailCtx.beginPath();detailCtx.ellipse(x,y,r,r*.6,hash(i,2)*6.28,0,TAU);detailCtx.fill();}
  const detail=texture(detailCanvas,aniso,1);detail.wrapS=detail.wrapT=THREE.RepeatWrapping;
  const rockCanvas=pixels(512,(x,y)=>{
    const warp=noise(x*.014,y*.009)*30;
    const strata=(noise(3,(y+warp)*.09)-.5)*42+(noise(x*.008,(y+warp)*.028)-.5)*22;
    const n=noise(x*.07,y*.09)*27+hash(x,y)*15;
    const fissure=Math.pow(clamp((noise(x*.08,y*.013)-.6)*4,0,1),3)*27;
    return [142+strata+n-fissure,100+strata*.8+n*.7-fissure,66+strata*.55+n*.5-fissure];
  });
  const rock=texture(rockCanvas,aniso,3);
  const cactus=texture(pixels(256,(x,y)=>{const rib=Math.pow((Math.cos(x/256*TAU*12)+1)/2,3),speck=hash(x,y);return [64+rib*39+speck*15,83+rib*42+speck*15,39+rib*25+speck*9];}),aniso,2);
  const rubber=texture(pixels(128,(x,y)=>{const g=hash(x,y)*18+noise(x*.15,y*.15)*10;return[24+g,26+g,23+g];}),aniso,3);
  // AI-authored albedo/detail maps. Loaded asynchronously; the procedural
  // textures stay as the immediate fallback while the image decodes.
  const loader=new THREE.TextureLoader();
  const aiRock=loader.load(new URL('./assets/rock.webp',import.meta.url).href);
  aiRock.colorSpace=THREE.SRGBColorSpace;aiRock.wrapS=aiRock.wrapT=THREE.RepeatWrapping;aiRock.repeat.set(2,2);aiRock.anisotropy=aniso;
  const aiDetail=loader.load(new URL('./assets/ground-detail.webp',import.meta.url).href);
  aiDetail.colorSpace=THREE.SRGBColorSpace;aiDetail.wrapS=aiDetail.wrapT=THREE.RepeatWrapping;aiDetail.anisotropy=aniso;
  // Periodic height fields produce seam-free linear-data normal/roughness maps.
  const relief=(rocky=false)=>{
    const n=256,heights=new Float32Array(n*n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const u=x/n*TAU,v=y/n*TAU;
      heights[y*n+x]=rocky?Math.sin(v*9+Math.sin(u*3)*2)*.3+Math.sin(u*17+v*13)*.13+hash(x,y)*.12:Math.sin(v*11+Math.sin(u*2)*1.2)*.13+Math.sin(u*37+v*29)*.025+hash(x,y)*.018;
    }
    const h=(x,y)=>heights[((y+n)%n)*n+(x+n)%n];
    const normal=texture(pixels(n,(x,y)=>{const dx=(h(x-1,y)-h(x+1,y))*2,dy=(h(x,y-1)-h(x,y+1))*2,l=Math.hypot(dx,dy,1);return[(dx/l*.5+.5)*255,(dy/l*.5+.5)*255,(1/l*.5+.5)*255];}),aniso,rocky?2:180);
    const roughness=texture(pixels(n,(x,y)=>{const r=rocky?190+h(x,y)*35:225+h(x,y)*40;return[r,r,r];}),aniso,rocky?2:180);
    normal.colorSpace=roughness.colorSpace=THREE.NoColorSpace;
    return {normal,roughness};
  };
  return {macro,freeMacro,detail:aiDetail,rock:aiRock,cactus,rubber,soilRelief:relief(),rockRelief:relief(true)};
}

// Uniforms shared by every soil material: the world rut record, the active
// map's wind ripples and sun glints. Values change per map, not per material.
const emptyTrack=new THREE.DataTexture(new Uint8Array(4),1,1);emptyTrack.needsUpdate=true;
const emptyFlow=new THREE.DataTexture(new Float32Array(4),1,1,THREE.RGBAFormat,THREE.FloatType);emptyFlow.needsUpdate=true;
// flowField: the GPU sand flow state (R bed, G rolling layer) for the coarse terrain.
export const soilUniforms={sandAlbedo:uniform(new THREE.Color('#e2c79e')),sandAlbedoOn:uniform(0),cascadeFar:uniform(720),flowField:tslTexture(emptyFlow),flowEnabled:uniform(0),terrainShadow:tslTexture(emptyTrack),shadowEnabled:uniform(0),flowTexel:uniform(1/1024),trackMap:tslTexture(emptyTrack),trackTexel:uniform(1),rippleStrength:uniform(0),windDir:uniform(new THREE.Vector2(1,0)),sparkle:uniform(0),sunDir:uniform(new THREE.Vector3(0,1,0)),memoryTex:tslTexture(emptyFlow),memoryOn:uniform(0),memoryInfo:uniform(new THREE.Vector4(512,2048,.25,0))};
// Coarse field height (h + r), bilinear between cell centres (vertex-safe).
function bilinearField(U,xz){
 const n=float(1).div(U.flowTexel),t=xz.add(450).div(900).mul(n).sub(.5),i=floor(t),f=fract(t);
 const at=o=>{const c=U.flowField.sample(i.add(o).add(.5).div(n)).level(0);return c.x.add(c.y);};
 return mix(mix(at(vec2(0,0)),at(vec2(1,0)),f.x),mix(at(vec2(0,1)),at(vec2(1,1)),f.x),f.y);
}
// Freshly flowing (rolling-layer) sand in the coarse field, 0..1.
const field_fresh=(U,uvNode)=>smoothstep(0,.02,U.flowField.sample(uvNode).y).mul(U.flowEnabled);
// Asymmetric sand-wave slope: gentle stoss over [0,k), steep lee over [k,1).
const waveSlope=(f,k)=>select(f.lessThan(k),f.div(k).mul(float(1).sub(f.div(k))).mul(6/k),f.sub(k).div(1-k).mul(float(1).sub(f.sub(k).div(1-k))).mul(-6/(1-k)));
// Procedural soil as a TSL node material (WebGPU, with WebGL2 fallback).
// trackStrength 1: shade recorded ruts from the track map (coarse terrain).
// trackStrength 0: geometry already carries the ruts (live sand patch).
export function applyTerrainTexture(material,textures,{trackStrength=0}={}){
  const U=soilUniforms,P=positionWorld,soilMap=tslTexture(textures.macro),detail=textures.detail;
  material.userData.sandBounds=uniform(new THREE.Vector4(0,0,0,0));
  material.userData.trackStrength=uniform(trackStrength);
  material.userData.soilMap=soilMap;
  // material.map keeps working for callers; it retargets the soil colour map.
  Object.defineProperty(material,'map',{configurable:true,get:()=>soilMap.value,set:value=>{if(value)soilMap.value=value;}});
  material.roughnessMap=textures.soilRelief.roughness;material.color.set('#ffffff');material.flatShading=false;
  const ts=material.userData.trackStrength,sb=material.userData.sandBounds;
  const trackUV=P.xz.add(450).div(900),record=U.trackMap.sample(trackUV),disturbed=record.b;
  // Persistent 25 cm ruts beyond the live window: sample the world-anchored
  // memory map for a track-floor tint and a normal perturbation. The coarse
  // mesh cannot resolve a 25 cm trench, but it can carry the line of it.
  const memN=U.memoryInfo.y,memUV=vec2(mod(floor(P.x.mul(4)),memN).add(.5),mod(floor(P.z.mul(4)),memN).add(.5)).div(memN);
  const mem=U.memoryTex.sample(memUV),memValid=trackStrength>0?mem.a.mul(U.memoryOn):float(0);
  const grain=tslTexture(detail,P.xz.mul(.22)).rgb,broad=tslTexture(detail,P.xz.mul(.043)).rgb;
  // Wild maps carry sandiness (where ripples form) in the colour map's alpha.
  const sandiness=soilMap.a.mul(U.rippleStrength);
  // Wind ripples: asymmetric sand waves (0.6 m, plus 2.4 m megaripples that
  // carry the striped look into the distance), warped so crests wander.
  // Smooth procedural warp: the photographic detail texture is full of cracks
  // and broke the ripple crests into blotches.
  const warp=mx_noise_float(vec3(P.xz.mul(.018),0)).mul(7).add(mx_noise_float(vec3(P.xz.mul(.07),7)).mul(1.8)).add(mx_noise_float(vec3(P.xz.mul(.3),3)).mul(.4));
  // Rotating the crest direction made concentric 'fingerprint' rings; sinuous
  // crests come from the multi-scale phase warp alone.
  const rippleDir=U.windDir,along=dot(P.xz,rippleDir),ripplePhase=along.div(.45).add(warp),megaPhase=along.div(3.1).add(warp.mul(.3));
  const rippleF=fract(ripplePhase),megaF=fract(megaPhase);
  const rippleBase=sandiness.mul(smoothstep(.8,.94,normalWorld.y)).mul(float(1).sub(disturbed));
  const ripple=rippleBase.mul(float(1).sub(smoothstep(.35,.9,fwidth(ripplePhase))));
  const mega=rippleBase.mul(float(1).sub(smoothstep(.4,1,fwidth(megaPhase))));
  // Dune-on-dune shadows from the GPU field multiply the sun's shadow term.
  // Cascaded shadow maps cover the near/middle range; the heightfield march
  // only takes over where the last cascade ends.
  const beyondCascades=smoothstep(U.cascadeFar.mul(.7),U.cascadeFar.mul(.95),length(cameraPosition.sub(P)));
  material.receivedShadowNode=Fn(([shadow])=>shadow.mul(mix(float(1),U.terrainShadow.sample(trackUV).r,U.shadowEnabled.mul(beyondCascades))));
  // Discard the coarse terrain under the live sand patch.
  material.maskNode=sb.y.greaterThan(sb.x).and(P.x.greaterThan(sb.x.add(.125))).and(P.x.lessThan(sb.y.sub(.125))).and(P.z.greaterThan(sb.z.add(.125))).and(P.z.lessThan(sb.w.sub(.125))).not();
  // Texture-free sand where the map says sand (GPU sand path); paint elsewhere.
  const paintOrSand=mix(soilMap.rgb,U.sandAlbedo.mul(float(1).add(field_fresh(U,trackUV).mul(.1))),soilMap.a.mul(U.sandAlbedoOn));
  material.colorNode=vec4(paintOrSand
    // Far ruts: darker, damp-looking trench floors and pale berm crests.
    .mul(float(1).sub(ts.mul(record.r.mul(.5).add(disturbed.mul(.06))))).mul(float(1).add(ts.mul(record.g).mul(.22)))
    // Dirt grain belongs to the basin soil; clean sand only keeps a trace of it.
    .mul(mix(vec3(1),grain.mul(1.65),mix(.65,.1,tslClamp(sandiness.add(soilMap.a.mul(U.sandAlbedoOn).mul(4)),0,1)))).mul(mix(vec3(1),broad.mul(1.5),mix(.2,.05,tslClamp(sandiness.add(soilMap.a.mul(U.sandAlbedoOn).mul(4)),0,1))))
    .mul(float(1).sub(ripple.mul(select(rippleF.greaterThan(.6),.03,-.008))).sub(mega.mul(select(megaF.greaterThan(.7),.02,0))))
    .mul(float(1).sub(memValid.mul(max(0,mem.r.negate()).mul(.9).add(mem.b.mul(.08))))),1);
  // Recorded trench walls/berms and the ripple faces tilt the normal.
  const t=U.trackTexel,height=c=>c.g.mul(.25).sub(c.r.mul(.4));
  const trackGrad=vec2(height(U.trackMap.sample(trackUV.add(vec2(t,0)))).sub(height(U.trackMap.sample(trackUV.sub(vec2(t,0))))),
    height(U.trackMap.sample(trackUV.add(vec2(0,t)))).sub(height(U.trackMap.sample(trackUV.sub(vec2(0,t)))))).div(t.mul(1800));
  const grad=trackGrad.mul(ts).mul(2.5).add(rippleDir.mul(waveSlope(rippleF,.6).mul(.022/.45).mul(ripple))).add(U.windDir.mul(waveSlope(megaF,.7).mul(.035/3.1).mul(mega)));
  let baseNormal=normalMap(tslTexture(textures.soilRelief.normal),vec2(.6,.6));
  if(trackStrength>0){
   // Coarse terrain follows the GPU sand flow: vertices take the field height
   // and the normal comes from the field gradient (plus the relief detail).
   const flowOn=U.flowEnabled.greaterThan(.5),field=U.flowField,ft=U.flowTexel,fieldUV=positionGeometry.xz.add(450).div(900);
   const cellHeight=c=>c.x.add(c.y),sampleField=o=>cellHeight(field.sample(trackUV.add(o)));
   material.positionNode=select(flowOn,vec3(positionGeometry.x,bilinearField(U,positionGeometry.xz),positionGeometry.z),positionGeometry);
   const span=ft.mul(1800),fieldNormal=normalize(vec3(sampleField(vec2(ft.negate(),0)).sub(sampleField(vec2(ft,0))).div(span),1,sampleField(vec2(0,ft.negate())).sub(sampleField(vec2(0,ft))).div(span)));
   baseNormal=select(flowOn,normalize(cameraViewMatrix.mul(vec4(fieldNormal,0)).xyz.add(baseNormal.sub(normalView))),baseNormal);
   // Beyond the fine window, the same ripple pattern continues as shading so
   // ripples run to the horizon without a seam (slope from screen derivatives).
   const rippleH=rippleHeight(P.xz,U.windDir,float(.045)),dpx=dFdx(P),dpy=dFdy(P),dhx=dFdx(rippleH),dhy=dFdy(rippleH);
   const det=dpx.x.mul(dpy.z).sub(dpx.z.mul(dpy.x)),gx=dhx.mul(dpy.z).sub(dhy.mul(dpx.z)).div(det),gz=dpx.x.mul(dhy).sub(dpy.x.mul(dhx)).div(det);
   const rippleFade=soilMap.a.mul(U.sandAlbedoOn).mul(float(1).sub(smoothstep(.25,.6,fwidth(dot(P.xz,U.windDir).div(RIPPLE_WAVELENGTH))))).mul(select(det.abs().greaterThan(1e-8),1,0));
   baseNormal=normalize(baseNormal.add(cameraViewMatrix.mul(vec4(gx.negate(),0,gz.negate(),0)).xyz.mul(rippleFade)));
   // Freshly flowing sand (grainflow tongues) reads a little paler.
   material.colorNode=material.colorNode.mul(vec4(vec3(float(1).add(select(flowOn,smoothstep(0,.02,field.sample(trackUV).y).mul(.12),0))),1));
  }
  material.normalNode=normalize(baseNormal.add(cameraViewMatrix.mul(vec4(grad.x.negate(),0,grad.y.negate(),0)).xyz));
  // Sun glints: a sparse set of grains with random facets catch the light.
  const cell=floor(P.xz.mul(24)),grainHash=fract(sin(dot(cell,vec2(12.9898,78.233))).mul(43758.5453));
  const facet=normalize(normalWorld.add(vec3(fract(grainHash.mul(37)),fract(grainHash.mul(91)),fract(grainHash.mul(53))).sub(.5).mul(1.1)));
  const halfVector=normalize(U.sunDir.add(normalize(cameraPosition.sub(P))));
  const glint=pow(max(dot(facet,halfVector),0),48).mul(step(.986,grainHash));
  const glintFade=float(1).sub(smoothstep(14,40,length(cameraPosition.sub(P)))).mul(float(1).sub(smoothstep(.6,1.4,fwidth(P.x.mul(24)))));
  // Glints are emissive, so gate them by the dune shadow and sun-facing surfaces.
  const sunlit=mix(float(1),U.terrainShadow.sample(trackUV).r,U.shadowEnabled.mul(beyondCascades)).mul(smoothstep(0,.15,dot(normalWorld,U.sunDir)));
  material.emissiveNode=vec3(1,.94,.82).mul(glint).mul(glintFade).mul(sunlit).mul(U.sparkle).mul(select(sandiness.greaterThan(0),1,.25)).mul(2.2);
  material.needsUpdate=true;
}
export function createSkyTexture(){
  const c=document.createElement('canvas');c.width=1024;c.height=512;
  const ctx=c.getContext('2d'),image=ctx.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
    const h=clamp(y/256,0,1),angle=x/c.width*TAU,r=h*7;
    const nx=Math.cos(angle)*r+40,ny=Math.sin(angle)*r+70;
    const cloudNoise=noise(nx,ny)*.58+noise(nx*2.1,ny*2.1)*.27+noise(nx*4.3,ny*4.3)*.15;
    const cloud=clamp((cloudNoise-.49)*5,0,1)*Math.sin(h*Math.PI)*.92;
    // Warm desert haze at the horizon, cooler blue overhead.
    const haze=Math.pow(h,2.0),zenith=[62,124,181],horizon=[238,207,171];
    const base=[zenith[0]+(horizon[0]-zenith[0])*haze,zenith[1]+(horizon[1]-zenith[1])*haze,zenith[2]+(horizon[2]-zenith[2])*haze];
    const i=(y*c.width+x)*4;for(let k=0;k<3;k++)image.data[i+k]=THREE.MathUtils.lerp(base[k],k===0?251:k===1?240:219,cloud);image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);return texture(c,1);
}

// Soft round sprite used by the dust plume; no external image needed.
export function createDustTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;
  const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(32,32,1,32,32,31);
  gradient.addColorStop(0,'rgba(255,246,225,.95)');gradient.addColorStop(.4,'rgba(246,222,185,.5)');gradient.addColorStop(1,'rgba(246,222,185,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
