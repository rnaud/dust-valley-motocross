const f=Math.fround;
// Original 0x4ba000 texture setup and 0x48b4c7..0x48b6cb vertex UVs.
// localX/localY are the tile's 0..16 sample coordinates, before world scaling.
export function mcmTerrainUv({terrainMode,tileIndex,width,height,orientation=0,localX,localY}) {
  if(!Number.isInteger(tileIndex)||tileIndex<0||tileIndex>255||width<=2||height<=2||orientation<0||orientation>7)throw new Error('Unsupported terrain UV input');
  const quarter=terrainMode!==1;
  const span=(width-2)*(quarter?.25:1);
  const uOffset=f(((quarter?tileIndex%4:0)*span+1)/width);
  const vOffset=f(((quarter?Math.trunc(tileIndex/16)%4:0)*span+1)/height);
  const scale=f((width-2)/width*(quarter?.015625:.0625));
  let u=f(localX*scale+uOffset),v=f(localY*scale+vOffset);
  switch(orientation){
    case 1:v=f(1-v);break;
    case 2:u=f(1-u);break;
    case 3:u=f(1-u);v=f(1-v);break;
    case 4:[u,v]=[v,f(1-u)];break;
    case 5:[u,v]=[v,u];break;
    case 6:[u,v]=[f(1-v),f(1-u)];break;
    case 7:[u,v]=[f(1-v),u];break;
  }
  return {uOffset,vOffset,scale,u,v};
}
