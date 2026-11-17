import * as THREE from 'three';
export const artStyles=[['original','Original','Current terrain, textures and lighting.'],['comic','Desert comic','Bold ink contours, poster colors and printed halftones.'],['woodcut','Ink woodcut','Warm paper, black ink and carved crosshatching.'],['neon','Neon night','Ultraviolet shadows, glowing cyan contours and scanlines.'],['blueprint','Blueprint','Technical cyan linework, contour bands and a drafting grid.'],['handheld','Pocket desert','Chunky pixels, ordered dithering and four green shades.']];
export class ArtStyleRenderer{
 constructor(renderer){
  this.renderer=renderer;this.style='original';this.size=new THREE.Vector2();
  this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthTexture:new THREE.DepthTexture(1,1,THREE.UnsignedIntType)});
  this.uniforms={sceneColor:{value:this.target.texture},sceneDepth:{value:this.target.depthTexture},resolution:{value:new THREE.Vector2(1,1)},style:{value:1},clip:{value:new THREE.Vector2(.1,1000)}};
  this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:this.uniforms,vertexShader:'varying vec2 screenUV; void main(){screenUV=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
   varying vec2 screenUV; uniform sampler2D sceneColor,sceneDepth; uniform vec2 resolution,clip; uniform int style;
   float lightness(vec3 c){return dot(c,vec3(.299,.587,.114));}
   float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   vec3 colorAt(vec2 uv){vec3 c=texture2D(sceneColor,uv).rgb;return pow(max(c/(1.+c),vec3(0.)),vec3(1./2.2));}
   float distanceAt(vec2 uv){float z=texture2D(sceneDepth,uv).x*2.-1.;return 2.*clip.x*clip.y/(clip.y+clip.x-z*(clip.y-clip.x));}
   void main(){
    vec2 px=screenUV*resolution,stepUV=1./resolution,uv=screenUV;
    if(style==5)uv=(floor(px/4.)*4.+2.)/resolution;
    vec3 c=colorAt(uv);float l=lightness(c),d=distanceAt(uv);
    float ex=abs(distanceAt(uv+vec2(stepUV.x*1.5,0.))-d),ey=abs(distanceAt(uv+vec2(0.,stepUV.y*1.5))-d);
    float edge=smoothstep(.008,.045,max(ex,ey)/max(d,.1));
    float ink=smoothstep(.035,.15,abs(lightness(colorAt(uv+stepUV*2.))-l));edge=max(edge,ink*.65);
    vec3 outColor=c;
    if(style==1){
     float bands=floor(l*5.)/4.;outColor=mix(vec3(.08,.16,.29),vec3(1.,.78,.31),bands);
     outColor=mix(outColor,c*1.25,.25);float dots=length(fract(px/6.)-.5);
     outColor*=mix(.45,1.,smoothstep(.14,.24,dots)+step(.58,l));outColor=mix(outColor,vec3(.025,.035,.06),edge);
    }else if(style==2){
     float hatch=step(.72,fract((px.x+px.y)*.17)),crossHatch=step(.79,fract((px.x-px.y)*.14));
     float marks=max(hatch*(1.-smoothstep(.32,.76,l)),crossHatch*(1.-smoothstep(.2,.55,l)));
     float paper=smoothstep(.24,.7,l)*(1.-marks);paper*=1.-edge;
     outColor=mix(vec3(.055,.045,.035),vec3(.94,.88,.71),paper)+(noise(px)-.5)*.035;
    }else if(style==3){
     vec3 base=mix(vec3(.025,.005,.09),vec3(.43,.025,.51),pow(l,2.));
     float glow=0.;for(int i=1;i<=3;i++){vec2 offset=stepUV*float(i)*3.;glow+=max(0.,lightness(colorAt(uv+offset))-l)+max(0.,lightness(colorAt(uv-offset))-l);}
     outColor=base+vec3(.02,.85,1.)*edge+vec3(.85,.03,.55)*glow*.8;
     outColor*=.9+.1*sin(px.y*3.14159);outColor+=pow(max(l-.73,0.),2.)*vec3(2.,.5,1.);
    }else if(style==4){
     float grid=max(1.-step(1.,mod(px.x,32.)),1.-step(1.,mod(px.y,32.)));
     float contour=(1.-smoothstep(.025,.09,abs(fract(log(1.+d)*8.)-.5)))*step(d,500.);
     outColor=vec3(.015,.065,.15)+vec3(.055,.2,.29)*grid+vec3(.24,.86,.95)*max(edge,contour*.45);
     outColor+=vec3(.03,.1,.15)*floor(l*4.)/4.;
    }else if(style==5){
     vec2 cell=mod(floor(px/4.),4.);float threshold=mod(cell.x*2.+cell.y*3.,4.)/4.;
     float level=floor(clamp(l*.92+(threshold-.5)*.2-edge*.25,0.,.999)*4.);
     outColor=level<1.?vec3(.06,.17,.16):level<2.?vec3(.19,.36,.26):level<3.?vec3(.53,.65,.32):vec3(.84,.9,.56);
    }
    gl_FragColor=vec4(clamp(outColor,0.,1.),1.);
   }`});
  this.scene=new THREE.Scene();this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));this.camera=new THREE.Camera();
 }
 setStyle(id){this.style=artStyles.some(s=>s[0]===id)?id:'original';this.uniforms.style.value=artStyles.findIndex(s=>s[0]===this.style);}
 render(scene,camera){
  const r=this.renderer;if(this.style==='original'){r.render(scene,camera);return;}
  r.getDrawingBufferSize(this.size);if(this.target.width!==this.size.x||this.target.height!==this.size.y)this.target.setSize(this.size.x,this.size.y);
  this.uniforms.resolution.value.copy(this.size);this.uniforms.clip.value.set(camera.near,camera.far);
  const previous=r.getRenderTarget();r.setRenderTarget(this.target);r.render(scene,camera);r.setRenderTarget(previous);r.render(this.scene,this.camera);
 }
}
