import * as THREE from 'three';
// Original implementations of the techniques referenced in docs/art-style-references.md.
export function createAsciiAtlas(){
 const glyphs=[['00000','00000','00000','00000','00000','00000','00000'],['00000','00000','00000','00000','00000','00100','00000'],['00000','00100','00000','00000','00100','00000','00000'],['00000','00000','00000','11111','00000','00000','00000'],['00000','00100','00100','11111','00100','00100','00000'],['00000','10101','01110','11111','01110','10101','00000'],['01010','01010','11111','01010','11111','01010','01010'],['01110','10001','10111','10101','10111','10000','01111']];
 const bytes=new Uint8Array(64*8*4);glyphs.forEach((rows,g)=>rows.forEach((row,y)=>[...row].forEach((bit,x)=>{const i=((7-y)*64+g*8+x+1)*4;bytes.set([255,255,255,bit==='1'?255:0],i);})));const texture=new THREE.DataTexture(bytes,64,8);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.needsUpdate=true;return texture;
}
export const experimentalHelpers=`
 uniform sampler2D asciiAtlas;
 float bayer(vec2 p){vec2 a=mod(floor(p),2.),b=mod(floor(p/2.),2.);return (4.*mod(a.x+2.*a.y,4.)+mod(b.x+2.*b.y,4.))/16.;}
 vec3 worldAt(vec2 uv){vec4 p=inverseProjection*vec4(uv*2.-1.,texture2D(sceneDepth,uv).x*2.-1.,1.);return (cameraWorld*vec4(p.xyz/p.w,1.)).xyz;}
 vec3 paintAt(vec2 uv){
  vec2 pixel=1./resolution;
  vec2 gradient=vec2(lightness(colorAt(uv+vec2(pixel.x*3.,0.)))-lightness(colorAt(uv-vec2(pixel.x*3.,0.))),lightness(colorAt(uv+vec2(0.,pixel.y*3.)))-lightness(colorAt(uv-vec2(0.,pixel.y*3.))));
  vec2 tangent=normalize(vec2(-gradient.y,gradient.x)+vec2(.0001));mat2 direction=mat2(tangent,vec2(-tangent.y,tangent.x));
  float minimum=100.;vec3 result=vec3(0.);
  // Bounded quadrant Kuwahara: choose the most coherent brush-sized region.
  for(int quadrant=0;quadrant<4;quadrant++){
   vec2 signum=vec2(mod(float(quadrant),2.)<.5?-1.:1.,quadrant<2?-1.:1.);vec3 sum=vec3(0.),square=vec3(0.);
   for(int y=0;y<3;y++)for(int x=0;x<3;x++){vec2 offset=direction*(vec2(float(x)*2.5,float(y)*1.4)*signum);vec3 sampleColor=colorAt(uv+offset*pixel);sum+=sampleColor;square+=sampleColor*sampleColor;}
   vec3 mean=sum/9.;float variance=dot(abs(square/9.-mean*mean),vec3(1.));if(variance<minimum){minimum=variance;result=mean;}
  }return result;
 }
`;
export const experimentalColor=`
 if(style==8){
  vec3 painted=paintAt(uv),world=worldAt(uv);float grain=noise(floor(world.xz*19.));
  float strokes=sin(world.x*24.+sin(world.z*5.)*2.);float fade=1.-smoothstep(.4,1.3,length(fwidth(world.xz))*24.);
  outColor=painted*(.96+.07*grain*fade)+strokes*.025*fade;
  outColor=pow(max(outColor,vec3(0.)),vec3(.78))*vec3(1.12,1.02,.88);outColor=mix(vec3(lightness(outColor)),outColor,1.35);
  float chroma=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));outColor=mix(outColor,c,smoothstep(.25,.45,chroma)*.5);
  if(texture2D(sceneDepth,uv).x>.99999)outColor=mix(vec3(.83,.86,.7),vec3(.42,.7,.78),smoothstep(.15,1.,uv.y));
 }else if(style==9){
  vec3 wash=vec3(0.);float total=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 off=vec2(float(x),float(y))*stepUV*3.;float weight=1./(1.+abs(distanceAt(uv+off)-d)*2.);wash+=colorAt(uv+off)*weight;total+=weight;}
  wash/=total;wash=mix(vec3(lightness(wash)),wash,1.35);
  vec3 paper=vec3(.98,.95,.86);float chroma=max(wash.r,max(wash.g,wash.b))-min(wash.r,min(wash.g,wash.b));
  vec3 pigment=mix(vec3(.91,.72,.45),wash,smoothstep(.18,.35,chroma));pigment*=mix(vec3(.68,.72,.95),vec3(1.),smoothstep(.25,.6,lightness(wash)));
  outColor=mix(paper,pigment,.63);outColor*=1.-edge*.12;
  if(texture2D(sceneDepth,uv).x>.99999)outColor=mix(paper,vec3(.64,.81,.87),smoothstep(.15,.85,uv.y)*.7);
  vec3 world=worldAt(uv);float grain=noise(floor(world.xz*45.));float fade=1.-smoothstep(.3,1.,length(fwidth(world.xz))*45.);
  outColor+=(grain-.5)*.055*fade;outColor=mix(outColor,paper,smoothstep(.72,.94,l)*.48);
 }else if(style==10){
  // 15-bit color and ordered dithering, over a genuinely low-resolution render.
  outColor=floor(clamp(c+(bayer(px)-.5)/31.,0.,1.)*31.+.5)/31.;
  float haze=smoothstep(65.,210.,d);outColor=mix(outColor,vec3(.68,.73,.69),haze*.5);
 }else if(style==11){
  vec2 block=vec2(4.),center=(floor(px/block)+.5)*block/resolution;
  vec3 base=colorAt(center);float z=distanceAt(center);vec2 stepBlock=block/resolution;
  float boundary=abs(1./distanceAt(center+vec2(stepBlock.x,0.))+1./distanceAt(center-vec2(stepBlock.x,0.))+1./distanceAt(center+vec2(0.,stepBlock.y))+1./distanceAt(center-vec2(0.,stepBlock.y))-4./z)*z;
  base=mix(vec3(lightness(base)),base,1.3);outColor=floor(base*7.+.5)/7.;
  outColor=mix(outColor,vec3(.1,.14,.19),smoothstep(.055,.22,boundary)*.9);
 }else if(style==12){
  vec2 glyphSize=vec2(8.,12.),cell=floor(px/glyphSize),sampleUV=(cell+.5)*glyphSize/resolution;
  vec3 source=colorAt(sampleUV);float value=lightness(source);
  float chroma=max(source.r,max(source.g,source.b))-min(source.r,min(source.g,source.b));
  float glyph=clamp(floor(pow(value,.9)*7.),1.,7.);glyph=max(glyph,step(.28,chroma)*6.);vec2 local=fract(px/glyphSize);
  float mask=texture2D(asciiAtlas,vec2((glyph+local.x)/8.,local.y)).a;
  vec3 terminal=mix(vec3(.2,.65,.57),vec3(.96,.79,.4),value);terminal=mix(terminal,vec3(.95,.93,.75),step(.28,chroma));
  outColor=mix(vec3(.018,.035,.04),terminal,mask);
 }
`;
// Hook each surface once per activation; restore the original hooks on exit.
// Existing terrain/material hooks run first and their cache identities survive.
export function prepareRetroMaterials(scene,enabled,grid,prepared){
 scene.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){
  if(material.userData.retroPrepared||!material.isMeshStandardMaterial&&!material.isMeshBasicMaterial)continue;
  const originalCacheKey=material.customProgramCacheKey;prepared.add({material,compile:material.onBeforeCompile,key:originalCacheKey});
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material),originalKey=key();
  material.onBeforeCompile=function(shader,renderer){
   compile.call(this,shader,renderer);shader.uniforms.retroEnabled=enabled;shader.uniforms.retroGrid=grid;
   shader.vertexShader='uniform float retroEnabled;uniform vec2 retroGrid;varying float retroW;\n'+shader.vertexShader;
   const end=shader.vertexShader.lastIndexOf('}');shader.vertexShader=shader.vertexShader.slice(0,end)+`
    retroW=mix(1.,gl_Position.w,retroEnabled);
    #ifdef USE_MAP
    vMapUv*=retroW;
    #endif
    if(retroEnabled>.5&&gl_Position.w>0.)gl_Position.xy=floor(gl_Position.xy/gl_Position.w*retroGrid+.5)/retroGrid*gl_Position.w;
   `+shader.vertexShader.slice(end);
   shader.fragmentShader='varying float retroW;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replaceAll('vMapUv','(vMapUv / retroW)'));
  };
  material.customProgramCacheKey=()=>originalKey+'-retro-v1';material.userData.retroPrepared=true;material.needsUpdate=true;
 }});
}

export function restoreRetroMaterials(prepared){for(const {material,compile,key}of prepared){material.onBeforeCompile=compile;material.customProgramCacheKey=key;delete material.userData.retroPrepared;material.needsUpdate=true;}prepared.clear();}
