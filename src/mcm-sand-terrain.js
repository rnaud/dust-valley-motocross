// Optional Dust Valley soil extension. Hardpack keeps the original tree intact.
// Deformation changes the original solver's sampled heights and normals; no
// second rigid-body solver or hidden force correction is involved.
export function deformableMcmTerrain(original,sand,toDisplay){
 const cache=new Map(),metres=.3048,gridFeet=1/original.worldToGrid;
 const delta=(x,z)=>sand.sample(x,z,(ix,iz)=>{
  const tx=Math.floor(ix/64),tz=Math.floor(iz/64),tile=sand.soil.get(`${tx},${tz}`);
  return tile?.delta[(iz-tz*64)*64+ix-tx*64]??0;
 });
 const at=(gx,gz)=>{const p=toDisplay([gx*gridFeet,0,gz*gridFeet]);return delta(p.x,p.z)/metres;};
 const wrap=raw=>{
  if(!raw)return null;if(cache.has(raw))return cache.get(raw);
  const n={...raw,minimumHeight:raw.minimumHeight-128,maximumHeight:raw.maximumHeight+128};cache.set(raw,n);
  if(raw.children){n.children=raw.children.map(wrap);return n;}
  let version=-1,heights=raw.heights,normals=raw.normals;
  const refresh=()=>{
   if(version===sand.version)return;version=sand.version;
   if(!sand.soil.size||raw.scale===0){heights=raw.heights;normals=raw.normals;return;}
   heights=raw.heights.map((h,i)=>{
    const gx=raw.originX+i%17,gz=raw.originY+Math.floor(i/17),change=at(gx,gz);
    return Math.max(0,Math.min(65535,h+Math.round(change/(original.heightScale*raw.scale))));
   });
   normals=raw.normals.map((normal,i)=>{
    const gx=raw.originX+i%17,gz=raw.originY+Math.floor(i/17);
    const dx=(at(gx+1,gz)-at(gx-1,gz))/(2*gridFeet),dz=(at(gx,gz+1)-at(gx,gz-1))/(2*gridFeet);
    if(dx===0&&dz===0)return normal;
    const v=[normal[0]-normal[1]*dx/raw.scale,normal[1],normal[2]-normal[1]*dz/raw.scale],length=Math.hypot(...v);
    return v.map(x=>Math.fround(x/length));
   });
  };
  Object.defineProperties(n,{heights:{get(){refresh();return heights;}},normals:{get(){refresh();return normals;}}});
  return n;
 };
 return {...original,root:wrap(original.root)};
}
