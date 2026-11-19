import {prepareRetroMaterials,restoreRetroMaterials} from './art-style-experiments.js';
import * as THREE from 'three';
import {RenderPipeline} from 'three/webgpu';
import {ao} from 'three/addons/tsl/display/GTAONode.js';
import {bloom} from 'three/addons/tsl/display/BloomNode.js';
import {fxaa} from 'three/addons/tsl/display/FXAANode.js';
import {Fn,If,abs,clamp,luminance,renderOutput,dot,exp,float,floor,fract,fwidth,getViewPosition,length,log,max,min,mix,mod,mrt,normalView,normalize,output,packNormalToRGB,pass,perspectiveDepthToViewZ,pow,screenUV,select,sin,smoothstep,step,texture,uniform,unpackRGBToNormal,vec2,vec3,vec4} from 'three/tsl';

export const artStyles=[['original','Original','Current terrain, textures and lighting.'],['neon','Neon night','Ultraviolet shadows, glowing cyan contours and scanlines.'],['moebius','Hiraeth / Moebius','Pale sand, lavender shade, fine ink and landscape-anchored stipple.'],['voxel','Voxel dunes','Experimental block-built terrain over the existing riding surface.'],['painted','Painted landscape','Directional brushwork, rich pigment and softened detail.'],['ps1','PS1 motocross','Low resolution, dithered color and snapping geometry.'],['pixel','Outlined pixel art','Chunky full-color pixels with crisp silhouette outlines.']];

const lightness=c=>dot(c,vec3(.299,.587,.114));
const hash=p=>fract(sin(dot(p,vec2(127.1,311.7))).mul(43758.5453));
const chroma=c=>max(c.r,max(c.g,c.b)).sub(min(c.r,min(c.g,c.b)));
const bayer=p=>{const a=mod(floor(p),2),b=mod(floor(p.div(2)),2);return mod(a.x.add(a.y.mul(2)),4).mul(4).add(mod(b.x.add(b.y.mul(2)),4)).div(16);};
// Screen uv with y up, as the GLSL styles were written (sky gradients etc.).
const upY=uv=>uv.y.oneMinus();

// Post-processing art styles as TSL graphs (WebGPU / WebGL2). Each style is
// built on first use; the scene renders once into a half-float pass with
// depth (and view normals for Hiraeth/Moebius).
export class ArtStyleRenderer{
 constructor(renderer){
  this.renderer=renderer;this.style='original';this.size=new THREE.Vector2();
  this.retroMaterials=new Map();this.retroGrid=uniform(new THREE.Vector2(160,120));
  this.resolution=uniform(new THREE.Vector2(1,1));
  this.pipeline=new RenderPipeline(renderer);this.pipeline.outputColorTransform=false;
  this.passes=new Map();this.nodes=new Map();this.current=null;this.useCinematic=false;
  this.grade={ao:uniform(.75),bloom:uniform(1),saturation:uniform(1.08),contrast:uniform(1.06),vignette:uniform(.22)};
  // Scene-camera uniforms: inside the post quad, TSL's camera* nodes refer to
  // the quad's own camera, so depth→distance/world must use these instead.
  this.view={near:uniform(.1),far:uniform(1000),projectionInverse:uniform(new THREE.Matrix4()),world:uniform(new THREE.Matrix4())};
 }
 setStyle(id){this.style=artStyles.some(s=>s[0]===id)?id:'original';}
 // Cinematic finish for the Original style: GTAO ambient occlusion (half
 // resolution, normals from depth), bloom, a filmic grade with warm highlights
 // and cool shadows, a soft vignette, tone mapping, then FXAA.
 cinematicPipeline(scene,camera){
  const key=scene.uuid+camera.uuid;if(this.cinematicKey===key)return this.cinematic;
  const scenePass=pass(scene,camera),color=scenePass.getTextureNode('output'),depth=scenePass.getTextureNode('depth');
  const occlusion=ao(depth,null,camera);occlusion.resolutionScale=.5;occlusion.radius.value=1.2;occlusion.distanceExponent.value=1.6;occlusion.thickness.value=2.5;occlusion.samples.value=12;
  const g=this.grade;
  const graded=Fn(()=>{
   let c=color.rgb.mul(mix(float(1),occlusion.getTextureNode().sample(screenUV).r,g.ao));
   c=c.add(bloom(vec4(c,1),.22,.45,.9).rgb.mul(g.bloom));
   const l=luminance(c);
   c=mix(vec3(l),c,g.saturation);
   c=pow(max(c.div(.18),vec3(0)),vec3(g.contrast)).mul(.18);
   const tone=smoothstep(.02,.6,l);c=c.mul(mix(vec3(.94,.98,1.06),vec3(1.05,1,.93),tone));
   c=c.mul(float(1).sub(smoothstep(.45,1.05,length(screenUV.sub(.5).mul(vec2(1.25,1)))).mul(g.vignette)));
   return vec4(c,1);
  })();
  const pipeline=new RenderPipeline(this.renderer);pipeline.outputColorTransform=false;pipeline.outputNode=fxaa(renderOutput(graded));
  this.cinematic=pipeline;this.cinematicKey=key;return pipeline;
 }
 // Moebius gets its own pass with a second (normal) render output. Toggling
 // MRT on a shared pass leaves stale pipelines with mismatched attachments.
 scenePass(scene,camera,normals){
  const key=scene.uuid+camera.uuid+(normals?'|n':'');let p=this.passes.get(key);
  if(!p){p=pass(scene,camera);if(normals)p.setMRT(mrt({output,normal:packNormalToRGB(normalView)}));this.passes.set(key,p);}
  return p;
 }
 build(style,scenePass){
  const res=this.resolution,view=this.view,color=scenePass.getTextureNode('output'),depthTex=scenePass.getTextureNode('depth');
  const normalTex=style==='moebius'?scenePass.getTextureNode('normal'):null;
  const colorAt=uv=>{const c=color.sample(uv).rgb;return pow(max(c.div(c.add(1)),vec3(0)),vec3(1/2.2));};
  const depthAt=uv=>depthTex.sample(uv).r;
  const distanceAt=uv=>perspectiveDepthToViewZ(depthAt(uv),view.near,view.far).negate();
  const worldAt=uv=>view.world.mul(vec4(getViewPosition(uv,depthAt(uv),view.projectionInverse),1)).xyz;
  const isSky=uv=>depthAt(uv).greaterThan(.99999);
  return Fn(()=>{
   const px=screenUV.mul(res),stepUV=vec2(1).div(res);
   const uv=style==='ps1'?floor(px).add(.5).div(res):screenUV;
   const c=colorAt(uv),l=lightness(c),d=distanceAt(uv);
   const ex=abs(distanceAt(uv.add(vec2(stepUV.x.mul(1.5),0))).sub(d)),ey=abs(distanceAt(uv.add(vec2(0,stepUV.y.mul(1.5)))).sub(d));
   const ink=smoothstep(.035,.15,abs(lightness(colorAt(uv.add(stepUV.mul(2)))).sub(l)));
   const edge=max(smoothstep(.008,.045,max(ex,ey).div(max(d,.1))),ink.mul(.65));
   let out=c;
   if(style==='neon'){
    let glow=float(0);
    for(let i=1;i<=3;i++){const o=stepUV.mul(i*3);glow=glow.add(max(0,lightness(colorAt(uv.add(o))).sub(l))).add(max(0,lightness(colorAt(uv.sub(o))).sub(l)));}
    out=mix(vec3(.025,.005,.09),vec3(.43,.025,.51),pow(l,2)).add(vec3(.02,.85,1).mul(edge)).add(vec3(.85,.03,.55).mul(glow).mul(.8));
    out=out.mul(sin(px.y.mul(Math.PI)).mul(.1).add(.9)).add(vec3(2,.5,1).mul(pow(max(l.sub(.73),0),2)));
   }else if(style==='moebius'){
    // Adapted from Hiraeth's print pipeline: reciprocal-depth Laplacian
    // rejects false ink on planar ground; world-space marks stay on surfaces.
    const dx=vec2(stepUV.x,0),dy=vec2(0,stepUV.y),inv=float(1).div(d);
    const lap=abs(float(1).div(distanceAt(uv.add(dx))).add(float(1).div(distanceAt(uv.sub(dx)))).add(float(1).div(distanceAt(uv.add(dy)))).add(float(1).div(distanceAt(uv.sub(dy)))).sub(inv.mul(4))).div(max(inv,.0001));
    const n=unpackRGBToNormal(normalTex.sample(uv).rgb);
    const crease=max(length(n.sub(unpackRGBToNormal(normalTex.sample(uv.add(dx)).rgb))),length(n.sub(unpackRGBToNormal(normalTex.sample(uv.add(dy)).rgb))));
    const line=max(smoothstep(.025,.1,lap),smoothstep(.35,.65,crease));
    const world=worldAt(uv),normal=normalize(view.world.mul(vec4(n,0)).xyz);
    const shade=smoothstep(.2,.5,dot(normal,normalize(vec3(-.5,.8,.35))));
    const pigment=mix(vec3(.94,.79,.56),floor(c.mul(5).add(.5)).div(5),smoothstep(.15,.38,chroma(c)));
    out=mix(pigment.mul(vec3(.65,.65,.87)),pigment,shade);
    const spacing=.28,footprint=length(fwidth(world.xz)).div(spacing),cellP=world.xz.div(spacing),center=floor(cellP);
    const jitter=vec2(hash(center),hash(center.add(31))).mul(.5).add(.25);
    const dotMask=smoothstep(.025,.075,length(fract(cellP).sub(jitter))).oneMinus().mul(step(.65,hash(center.add(75))));
    const hatch=smoothstep(.04,.1,abs(fract(world.x.add(world.z).mul(3)).sub(.5))).oneMinus();
    const marks=max(dotMask.mul(.28),hatch.mul(shade.oneMinus()).mul(.25)).mul(smoothstep(.25,.8,footprint).oneMinus());
    out=mix(out,vec3(.23,.23,.32),marks);
    const haze=exp(d.mul(-.0025)).oneMinus(),horizon=vec3(.81,.87,.84);
    out=mix(out,horizon,haze.mul(.7));out=mix(out,vec3(.17,.13,.12),line.mul(haze.oneMinus()).mul(.8));
    out=select(isSky(uv),mix(horizon,vec3(.36,.67,.8),smoothstep(.25,1,upY(uv))),out);
   }else if(style==='painted'){
    // Bounded quadrant Kuwahara along the local luminance gradient.
    const pixel=stepUV,g=vec2(lightness(colorAt(uv.add(vec2(pixel.x.mul(3),0)))).sub(lightness(colorAt(uv.sub(vec2(pixel.x.mul(3),0))))),lightness(colorAt(uv.add(vec2(0,pixel.y.mul(3))))).sub(lightness(colorAt(uv.sub(vec2(0,pixel.y.mul(3)))))));
    const tangent=normalize(vec2(g.y.negate(),g.x).add(.0001)),bitangent=vec2(tangent.y.negate(),tangent.x);
    let best=float(100).toVar(),painted=vec3(0).toVar();
    for(let q=0;q<4;q++){
     const sx=q%2<1?-1:1,sy=q<2?-1:1;let sum=vec3(0),square=vec3(0);
     for(let y=0;y<3;y++)for(let x=0;x<3;x++){const o=tangent.mul(x*2.5*sx).add(bitangent.mul(y*1.4*sy)),s=colorAt(uv.add(o.mul(pixel)));sum=sum.add(s);square=square.add(s.mul(s));}
     const mean=sum.div(9),variance=dot(abs(square.div(9).sub(mean.mul(mean))),vec3(1));
     If(variance.lessThan(best),()=>{best.assign(variance);painted.assign(mean);});
    }
    const world=worldAt(uv),grainV=hash(floor(world.xz.mul(19))),strokes=sin(world.x.mul(24).add(sin(world.z.mul(5)).mul(2)));
    const fade=smoothstep(.4,1.3,length(fwidth(world.xz)).mul(24)).oneMinus();
    out=painted.mul(grainV.mul(.07).mul(fade).add(.96)).add(strokes.mul(.025).mul(fade));
    out=pow(max(out,vec3(0)),vec3(.78)).mul(vec3(1.12,1.02,.88));out=mix(vec3(lightness(out)),out,1.35);
    out=mix(out,c,smoothstep(.25,.45,chroma(c)).mul(.5));
    out=select(isSky(uv),mix(vec3(.83,.86,.7),vec3(.42,.7,.78),smoothstep(.15,1,upY(uv))),out);
   }else if(style==='ps1'){
    // 15-bit color and ordered dithering, over a genuinely low-resolution render.
    out=floor(clamp(c.add(bayer(px).sub(.5).div(31)),0,1).mul(31).add(.5)).div(31);
    out=mix(out,vec3(.68,.73,.69),smoothstep(65,210,d).mul(.5));
   }else if(style==='pixel'){
    const block=vec2(4),center=floor(px.div(block)).add(.5).mul(block).div(res),z=distanceAt(center),sb=block.div(res);
    const boundary=abs(float(1).div(distanceAt(center.add(vec2(sb.x,0)))).add(float(1).div(distanceAt(center.sub(vec2(sb.x,0))))).add(float(1).div(distanceAt(center.add(vec2(0,sb.y))))).add(float(1).div(distanceAt(center.sub(vec2(0,sb.y))))).sub(float(4).div(z))).mul(z);
    let base=colorAt(center);base=mix(vec3(lightness(base)),base,1.3);
    out=mix(floor(base.mul(7).add(.5)).div(7),vec3(.1,.14,.19),smoothstep(.055,.22,boundary).mul(.9));
   }
   return vec4(clamp(out,0,1),1);
  })();
 }
 render(scene,camera){
  const r=this.renderer,style=this.style;
  if(style==='ps1')prepareRetroMaterials(scene,r,this.retroGrid,this.retroMaterials);else if(this.retroMaterials.size)restoreRetroMaterials(this.retroMaterials);
  if(style==='original'&&this.useCinematic){this.cinematicPipeline(scene,camera).render();return;}
  if(style==='original'||style==='voxel'){r.render(scene,camera);return;}
  r.getDrawingBufferSize(this.size);
  camera.updateMatrixWorld();this.view.near.value=camera.near;this.view.far.value=camera.far;this.view.projectionInverse.value.copy(camera.projectionMatrixInverse);this.view.world.value.copy(camera.matrixWorld);
  const scenePass=this.scenePass(scene,camera,style==='moebius');
  let scale=1;
  if(style==='ps1'){scale=240/this.size.y;this.retroGrid.value.set(Math.round(240*this.size.x/this.size.y),240).multiplyScalar(.5);}
  else if(style==='painted')scale=Math.min(1,960/this.size.x);
  scenePass.setResolutionScale(scale);this.resolution.value.set(Math.max(1,Math.floor(this.size.x*scale)),Math.max(1,Math.floor(this.size.y*scale)));
  const key=style+scenePass.id;
  if(this.current!==key){
   if(!this.nodes.has(key))this.nodes.set(key,this.build(style,scenePass));
   this.pipeline.outputNode=this.nodes.get(key);this.pipeline.needsUpdate=true;this.current=key;
  }
  this.pipeline.render();
 }
}
