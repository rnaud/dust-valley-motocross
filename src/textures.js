import * as THREE from 'three';
import { track, TAU } from './world.js';

// Seeded value noise: all artwork is generated locally; no downloaded assets.
function hash(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);}
const clamp=THREE.MathUtils.clamp;
function canvas(size){const c=document.createElement('canvas');c.width=c.height=size;return c;}
function texture(c,anisotropy,repeat=1){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=anisotropy;if(repeat!==1){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);}return t;}
function pixels(size,fn){const c=canvas(size),ctx=c.getContext('2d'),image=ctx.createImageData(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const color=fn(x,y);const i=(y*size+x)*4;for(let k=0;k<3;k++)image.data[i+k]=color[k];image.data[i+3]=255;}ctx.putImageData(image,0,0);return c;}

export function createTextures(renderer,mobile){
  const aniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  // A world-space color map gives each part of the basin its own soil and scrub.
  const size=mobile?1024:1536;
  const terrainCanvas=pixels(size,(px,py)=>{
    const x=px/size*900-450,z=py/size*900-450;
    const broad=noise(x*.017+70,z*.017+90),patch=noise(x*.085+10,z*.085+40),fine=noise(x*.42,z*.42);
    const grass=clamp((broad*.5+patch*.5-.43)*4,0,1);
    const gravel=fine*22+hash(px,py)*13;
    return [151+patch*32-grass*46+gravel,115+patch*25-grass*12+gravel*.85,72+patch*15-grass*20+gravel*.6];
  });
  // Paint the actual course, including continuous worn lanes and tire grooves.
  const ctx=terrainCanvas.getContext('2d');const scale=size/900;
  const path=(offset,width,color)=>{ctx.beginPath();for(let i=0;i<=900;i++){const a=i/900*TAU,p=track(a),q=track(a+.001),l=Math.hypot(q.x-p.x,q.z-p.z);const x=p.x+(q.z-p.z)/l*offset,z=p.z-(q.x-p.x)/l*offset;const px=(x+450)*scale,py=(z+450)*scale;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width*scale;ctx.lineJoin='round';ctx.stroke();};
  path(0,25,'rgba(133,104,65,.23)');path(0,21,'rgba(154,114,69,.65)');path(0,17,'#976a42');path(0,12,'#a87c4f');
  for(const lane of [-6,-3,0,3,6]){path(lane,1.2,'rgba(70,46,29,.27)');path(lane+.65,.35,'rgba(227,186,127,.4)');}
  // Break up painted areas with translucent coarse soil, avoiding a flat ribbon.
  const image=ctx.getImageData(0,0,size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;const shade=.81+noise(x*.11,y*.11)*.29+hash(x+50,y)*.12;for(let k=0;k<3;k++)image.data[i+k]*=shade;}
  ctx.putImageData(image,0,0);
  const macro=texture(terrainCanvas,aniso);
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
  return {macro,detail,rock,cactus,rubber};
}

export function applyTerrainTexture(material,textures){
  material.map=textures.macro;material.color.set('#ffffff');material.vertexColors=false;material.flatShading=false;
  // Fine detail is projected in world space, independently of the large color map.
  material.onBeforeCompile=shader=>{
    shader.uniforms.soilDetail={value:textures.detail};
    shader.vertexShader='varying vec3 soilPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsoilPosition = position;');
    shader.fragmentShader='uniform sampler2D soilDetail;\nvarying vec3 soilPosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec3 grain = texture2D(soilDetail, soilPosition.xz * .22).rgb;
      vec3 broadGrain = texture2D(soilDetail, soilPosition.xz * .043).rgb;
      diffuseColor.rgb *= mix(vec3(1.0), grain * 1.65, .65) * mix(vec3(1.0), broadGrain * 1.5, .2);`);
  };
  material.customProgramCacheKey=()=> 'procedural-soil-v1';
}

export function createSkyTexture(){
  const c=document.createElement('canvas');c.width=1024;c.height=512;
  const ctx=c.getContext('2d'),image=ctx.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
    const h=clamp(y/256,0,1),angle=x/c.width*TAU,r=h*7;
    const nx=Math.cos(angle)*r+40,ny=Math.sin(angle)*r+70;
    const cloudNoise=noise(nx,ny)*.58+noise(nx*2.1,ny*2.1)*.27+noise(nx*4.3,ny*4.3)*.15;
    const cloud=clamp((cloudNoise-.49)*5,0,1)*Math.sin(h*Math.PI)*.92;
    const haze=Math.pow(h,2.3),base=[70+113*haze,128+76*haze,170+40*haze];
    const i=(y*c.width+x)*4;for(let k=0;k<3;k++)image.data[i+k]=THREE.MathUtils.lerp(base[k],245-k*3,cloud);image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);return texture(c,1);
}
