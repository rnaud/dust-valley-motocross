// The same diagonal as Cannon's heightfield after its -90-degree X rotation.
export function terrainIndices(segments){
 const indices=[];for(let z=0;z<segments;z++)for(let x=0;x<segments;x++){
  const a=z*(segments+1)+x,b=a+segments+1,c=b+1,d=a+1;indices.push(a,b,c,a,c,d);
 }
 return indices;
}
export function sampleGrid(getHeight,x,z,segments=300,spacing=3){
 const half=segments*spacing/2,gx=Math.max(0,Math.min(segments-.00001,(x+half)/spacing)),gz=Math.max(0,Math.min(segments-.00001,(z+half)/spacing));
 const ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz;
 const a=getHeight(iz*(segments+1)+ix),b=getHeight((iz+1)*(segments+1)+ix),c=getHeight((iz+1)*(segments+1)+ix+1),d=getHeight(iz*(segments+1)+ix+1);
 return u<=v?a+(c-b)*u+(b-a)*v:a+(d-a)*u+(c-d)*v;
}
