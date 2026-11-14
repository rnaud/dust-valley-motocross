import {resolveMcmWorldMatrix} from './world-transform.js';
import {inverseTransformMcmPoint} from './position-transform.js';
import {queryMcmTerrainHeight} from './terrain-height.js';
import {queryMcmTerrainNormal} from './terrain-normal.js';
const f=Math.fround,regions=[0,0,1,1,2,2,0,3,3,3,3];

// Original 0x40bb40: eleven animated body probes, deepest penetration wins.
// No-hit leaves output vectors and the previous body-region index untouched.
export function queryMcmRiderTerrain({rider,points,bodyNode,terrain,output}){
 if(points.length!==11)throw Error('Rider terrain query requires eleven body nodes');
 const body=resolveMcmWorldMatrix(bodyNode),m=rider.matrix;
 const worldPoints=points.map(node=>{
  const relative=node===bodyNode?[0,0,0]:inverseTransformMcmPoint(body,resolveMcmWorldMatrix(node).slice(12,15));
  const x=f(relative[0]-rider.center[0]),y=f(relative[1]-rider.center[1]),rawZ=relative[2]-rider.center[2],z=f(rawZ);
  return [f(((rawZ*m[8]+y*m[4])+x*m[0])+m[12]),f(((z*m[9]+y*m[5])+x*m[1])+m[13]),f(((z*m[10]+y*m[6])+x*m[2])+m[14])];
 });
 let hit=0,maximum=0,selected=0;const normals=[];
 for(let i=0;i<11;i++){
  const point=worldPoints[i],surface=queryMcmTerrainHeight({...terrain,point});
  normals.push(queryMcmTerrainNormal({...terrain,point,normal:[0,0,0]}));
  if(point[1]<surface[1]){
   hit=1;const depth=surface[1]-point[1];
   if(maximum<depth){selected=i;maximum=f(depth);}
  }
 }
 if(hit){output.point=[...worldPoints[selected]];output.normal=[...normals[selected]];output.penetration=[0,maximum,0];rider.region=regions[selected];}
 return hit;
}
