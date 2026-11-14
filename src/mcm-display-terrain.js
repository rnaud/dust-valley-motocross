// Height-only display query: the mesh does not need the interpolated normals
// computed by the physics sampler. Physics continues to use the native routines.
export function displayMcmHeight(terrain,px,pz){
 const f=Math.fround,x=Math.max(0,f(px*terrain.worldToGrid)),z=Math.max(0,f(pz*terrain.worldToGrid));
 const ix=Math.floor(x),iz=Math.floor(z),dx=x-ix,dz=z-iz;
 const h=(gx,gz)=>{
  let n=terrain.root;
  while(n?.level){
   if(!n.children)return 0;
   const shift=n.level===1?4:8,size=1<<shift,mask=size-1;let bx=gx>>shift,bz=gz>>shift;
   let child=bx<16&&bz<16?n.children[bz*16+bx]:null;
   if(!child){if(bx>=16){bx=15;gx=size-1;}if(bz>=16){bz=15;gz=size-1;}child=n.children[bz*16+bx];if(!child)return 0;}
   gx&=mask;gz&=mask;n=child;
  }
  if(!n||gx>16||gz>16)throw Error('Display terrain sample outside leaf');
  return f(((n.heights[gz*17+gx]-n.bias)*n.scale+n.bias)*terrain.heightScale);
 };
 const a=h(ix,iz),b=h(ix+1,iz),c=h(ix,iz+1),d=h(ix+1,iz+1);
 if((ix^iz)&1)return dx+dz<1?f((b-a)*dx+a+(c-a)*dz):f((d-c)*dx+c+(b-d)*(1-dz));
 return dx>dz?f((b-a)*dx+a+(d-b)*dz):f((d-c)*dx+c+(a-c)*(1-dz));
}
