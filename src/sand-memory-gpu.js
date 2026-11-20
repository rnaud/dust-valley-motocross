import {FloatType,NearestFilter,NodeMaterial,QuadMesh,RGBAFormat,RenderTarget,Vector2,Vector4} from 'three/webgpu';
import {Fn,float,floor,mod,texture,uniform,uv,vec4} from 'three/tsl';

// A world-anchored 25 cm record of the fine sand field. The fine field itself
// only covers 128 m and is toroidal: nodes that scroll out are lost. This map
// keeps their detail, compaction and disturbance, so driving back over an old
// trail finds the trail instead of fresh ripples.
//
// Layout: one texel per 25 cm node, toroidal. RGBA float:
//   R detail (m, signed), G compaction, B disturbance, A 1 once written.
// The map is written from the live field on window moves and every few steps;
// entering nodes read it in FineSandGPU. It is also sampled by the coarse
// terrain material for far-rut shading.
export class SandMemory{
 constructor(renderer,{size=2048}={}){
  this.renderer=renderer;this.n=size;this.extent=size*.25;this.texel=.25;
  this.target=new RenderTarget(size,size,{type:FloatType,format:RGBAFormat,minFilter:NearestFilter,magFilter:NearestFilter,depthBuffer:false,generateMipmaps:false});
  this.origin=uniform(new Vector2());this.fineN=uniform(1);
  this.stateNode=texture(this.target.texture);
  this.writeMaterial=new NodeMaterial();
  this.writeMaterial.fragmentNode=Fn(()=>{
   const t=floor(uv().mul(this.n));
   const rel=mod(t.sub(this.origin),float(this.n));
   const s=this.stateNode.sample(rel.add(.5).div(this.fineN));
   return vec4(s.x,s.y,s.z,1);
  })();
  this.fillMaterial=new NodeMaterial();
  this.fillMaterial.fragmentNode=vec4(0,0,0,0);
  this.quad=new QuadMesh(this.fillMaterial);
  this.clear();
 }
 get texture(){return this.target.texture;}
 get info(){return new Vector4(this.extent,this.n,this.texel,0);}
 _pass(material,rect){
  const r=this.renderer,previous=r.getRenderTarget(),auto=r.autoClear;
  r.autoClear=false;r.setRenderTarget(this.target);
  if(rect){r.setScissorTest(true);r.setScissor(rect[0],rect[1],rect[2],rect[3]);}
  this.quad.material=material;this.quad.render(r);
  if(rect)r.setScissorTest(false);
  r.setRenderTarget(previous);r.autoClear=auto;
 }
 clear(){this._pass(this.fillMaterial,null);}
 write(fine){
  if(!fine?.enabled||!fine.texture)return;
  this.stateNode.value=fine.texture;this.fineN.value=fine.n;
  const o=fine.origin.value,n=fine.n,N=this.n;
  const ox=((o.x%N)+N)%N,oy=((o.y%N)+N)%N;
  const xs=[[ox,Math.min(n,N-ox)]];if(n>N-ox)xs.push([0,n-(N-ox)]);
  const ys=[[oy,Math.min(n,N-oy)]];if(n>N-oy)ys.push([0,n-(N-oy)]);
  this.origin.value.copy(o);
  for(const [x,w]of xs)for(const [y,h]of ys)if(w>0&&h>0)this._pass(this.writeMaterial,[x,y,w,h]);
 }
 dispose(){this.target?.dispose();this.writeMaterial?.dispose?.();this.fillMaterial?.dispose?.();}
}
