// World-space record of every rut the rider has made, so trenches and berms
// stay readable on the coarse terrain long after the live 48 m sand patch
// has moved on. One RGBA8 texel per ~0.44 m (2048² over 900 m):
//   R = rut depth (0..DEPTH m), G = berm lift (0..LIFT m), B = disturbed (erases ripples).
// Texel rows follow v=(z+450)/900, matching the terrain shader's lookup.
export const TRACK_EXTENT=900,TRACK_DEPTH=.4,TRACK_LIFT=.25;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class TrackMap{
 constructor(size=2048){
  this.size=size;this.data=new Uint8Array(size*size*4);this.dirty=null;this.version=0;
 }
 texel(x,z){
  const s=this.size,px=Math.floor((x+TRACK_EXTENT/2)/TRACK_EXTENT*s),py=Math.floor((z+TRACK_EXTENT/2)/TRACK_EXTENT*s);
  return px<0||py<0||px>=s||py>=s?-1:py*s+px;
 }
 // delta: soil displacement in metres (negative = rut, positive = berm).
 record(x,z,delta){
  const i=this.texel(x,z);if(i<0)return;
  const o=i*4,d=this.data,depth=Math.round(clamp(-delta/TRACK_DEPTH,0,1)*255),lift=Math.round(clamp(delta/TRACK_LIFT,0,1)*255);
  // Several soil nodes share a texel: keep the strongest trench and berm.
  if(depth<=d[o]&&lift<=d[o+1]&&d[o+2]===255)return;
  d[o]=Math.max(d[o],depth);d[o+1]=Math.max(d[o+1],lift);d[o+2]=255;d[o+3]=255;
  const s=this.size,px=i%s,py=(i-px)/s,b=this.dirty;
  if(!b)this.dirty={minX:px,minY:py,maxX:px+1,maxY:py+1};
  else{b.minX=Math.min(b.minX,px);b.minY=Math.min(b.minY,py);b.maxX=Math.max(b.maxX,px+1);b.maxY=Math.max(b.maxY,py+1);}
 }
 // Sand-surface observer: soil nodes are 0.25 m apart.
 observe(cells,sand){for(const [ix,iz] of cells)this.record(ix*.25,iz*.25,sand.deltaAt(ix,iz));}
 sample(x,z){const i=this.texel(x,z);if(i<0)return {depth:0,lift:0,disturbed:false};const o=i*4;return {depth:this.data[o]/255*TRACK_DEPTH,lift:this.data[o+1]/255*TRACK_LIFT,disturbed:this.data[o+2]===255};}
 // Returns and clears the dirty texel box (max exclusive), or null.
 takeDirty(){const b=this.dirty;this.dirty=null;return b;}
 clear(){this.data.fill(0);this.dirty=null;this.version++;}
}
