import {queryMcmTerrainHeight} from './terrain-height.js';
import {queryMcmTerrainNormal} from './terrain-normal.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {rotateMcmWorldVector} from './collision-impulse.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';
const f=Math.fround;
const cross=(a,b)=>[f(a[1]*b[2]-b[1]*a[2]),f(a[2]*b[0]-b[2]*a[0]),f(a[0]*b[1]-b[0]*a[1])];
const normalize=(v,squared)=>{
 if(squared===0)return [0,0,0];
 const inverse=mcmInverseSqrt(f(squared));return v.map(x=>f(x*inverse));
};
// Original 0x4a1450. A null up vector uses the node's rotated world-up axis.
export function buildMcmWheelContactAxis({node,forward,up}){
 const v=cross(forward,up||rotateMcmWorldVector(resolveMcmWorldMatrix(node),[0,1,0]));
 return normalize(v,(v[2]*v[2]+v[1]*v[1])+v[0]*v[0]);
}

// Original 0x4a0130..0x4a0442: both initial terrain samples, front contact
// frame and radius-offset resample. Later rear/contact-depth work is separate.
export function prepareMcmWheelContactFrame(c){
 const p=c.points;
 const sample=(point,normal)=>({point:queryMcmTerrainHeight({...c.terrain,point}),normal:queryMcmTerrainNormal({...c.terrain,point,normal})});
 p[3]=[...p[1]];p[2]=[...p[0]];
 let sampleResult=sample(p[3],p[5]);p[3]=sampleResult.point;p[5]=sampleResult.normal;
 sampleResult=sample(p[2],p[4]);p[2]=sampleResult.point;p[4]=sampleResult.normal;
 const forward=rotateMcmWorldVector(resolveMcmWorldMatrix(c.node),[0,0,1]);
 p[8]=buildMcmWheelContactAxis({node:c.node,forward});
 let tangent=cross(p[4],p[8]);
 if(tangent.every(x=>x===0))tangent=[...forward];
 else tangent=normalize(tangent,(tangent[1]*tangent[1]+tangent[2]*tangent[2])+tangent[0]*tangent[0]);
 c.tangent=tangent;c.normal=cross(tangent,p[8]);
 const n=c.normal,t=p[4];
 if((n[1]*t[1]+n[0]*t[0])+t[2]*n[2]>0){c.normal=n.map(x=>f(-x));p[8]=p[8].map(x=>f(-x));}
 c.offset=c.normal.map(x=>f(c.radius*x));
 p[6]=p[0].map((x,i)=>f(x+c.offset[i]));p[2]=[...p[6]];
 sampleResult=sample(p[2],c.resampleNormal);p[2]=sampleResult.point;
 return {forward,resampleNormal:sampleResult.normal};
}

// Extend the same routine through 0x4a06ee: rear frame/resample and initial
// height differences. Later pitch/contact-depth corrections are not included.
export function prepareMcmWheelContactPair(c){
 const result=prepareMcmWheelContactFrame(c),p=c.points;
 p[9]=buildMcmWheelContactAxis({node:c.node,forward:c.bikeForward,up:c.bikeUp});
 let tangent=cross(p[5],p[9]);
 if(tangent.every(x=>x===0))tangent=[...c.bikeForward];
 else tangent=normalize(tangent,(tangent[1]*tangent[1]+tangent[2]*tangent[2])+tangent[0]*tangent[0]);
 c.rearTangent=tangent;c.normal=cross(tangent,p[9]);
 const n=c.normal,t=p[5];
 if((n[1]*t[1]+n[0]*t[0])+t[2]*n[2]>0){c.normal=n.map(x=>f(-x));p[9]=p[9].map(x=>f(-x));}
 c.offset=c.normal.map(x=>f(c.rearRadius*x));
 p[7]=p[1].map((x,i)=>f(x+c.offset[i]));p[3]=[...p[7]];
 const rearResampleNormal=queryMcmTerrainNormal({...c.terrain,point:p[3],normal:c.rearResampleNormal});
 p[3]=queryMcmTerrainHeight({...c.terrain,point:p[3]});
 c.heights=[f(p[2][1]-p[6][1]),f(p[3][1]-p[7][1])];
 return {...result,rearResampleNormal};
}

// Reference runtime: Wine 11 D3DRMVectorRotate([0,0,1], [0,1,0], heading).
// Quaternion products and final normalization round every SSE float operation.
export function rotateMcmContactHeading(heading){
 const mul=(a,b)=>{
  const cross=[f(f(a[2]*b[3])-f(a[3]*b[2])),f(f(a[3]*b[1])-f(a[1]*b[3])),f(f(a[1]*b[2])-f(a[2]*b[1]))];
  return [f(f(a[0]*b[0])-f(f(f(a[1]*b[1])+f(a[2]*b[2]))+f(a[3]*b[3]))),...cross.map((x,i)=>f(f(f(a[i+1]*b[0])+f(a[0]*b[i+1]))+x))];
 };
 const half=f(heading*.5),s=f(Math.sin(half)),co=f(Math.cos(half));
 const q=[co,f(0*s),s,f(0*s)],v=mul(mul(q,[0,0,0,1]),[co,...q.slice(1).map(x=>f(-x))]).slice(1);
 const length=f(Math.sqrt(f(f(f(v[0]*v[0])+f(v[1]*v[1]))+f(v[2]*v[2]))));
 return length===0?[1,0,0]:v.map(x=>f(x*f(1/length)));
}

// Continue through 0x4a0a68. The original equality branch compares a float32
// pitch against double pi/2; finite inputs always take the heading-based path.
export function prepareMcmWheelContactProbes(c){
 const result=prepareMcmWheelContactPair(c),p=c.points;
 const heading=rotateMcmContactHeading(c.heading);
 const side=direction=>{const v=cross(direction,[0,1,0]);return normalize(v,(v[1]*v[1]+v[2]*v[2])+v[0]*v[0]);};
 c.normal=p[1].map((x,i)=>f(x-c.rearRadius*heading[i]));
 const rearSide=side(heading),rear=p[1].map((_,i)=>f(c.normal[i]+(c.rearRadius*c.sinRoll)*rearSide[i]));
 c.normal=p[0].map((x,i)=>f(x+c.radius*c.tangent[i]));
 const frontSide=side(c.tangent),front=p[0].map((_,i)=>f(c.normal[i]+(c.radius*c.sinRoll)*frontSide[i]));
 const points=[front,rear],normals=c.probeNormals.map((normal,i)=>queryMcmTerrainNormal({...c.terrain,point:points[i],normal}));
 return {...result,probePoints:points.map(point=>queryMcmTerrainHeight({...c.terrain,point})),probeNormals:normals};
}

// Complete 0x4a0130 for finite inputs: refine both frames at the side probes,
// resample their radius-offset contacts, then keep the greater penetration.
export function queryMcmWheelContacts(c){
 const result=prepareMcmWheelContactProbes(c),p=c.points;
 const tangent=(normal,axis,fallback)=>{
  const v=cross(normal,axis);
  return v.every(x=>x===0)?[...fallback]:normalize(v,(v[1]*v[1]+v[2]*v[2])+v[0]*v[0]);
 };
 const tangents=[tangent(result.probeNormals[0],p[8],result.forward),tangent(result.probeNormals[1],p[9],c.bikeForward)];
 const contacts=tangents.map((t,i)=>{
  c.normal=cross(t,p[8+i]);const n=c.normal,s=result.probeNormals[i];
  if((n[0]*s[0]+n[1]*s[1])+n[2]*s[2]>0)c.normal=n.map(x=>f(-x));
  c.offset=c.normal.map(x=>f(x*(i?c.rearRadius:c.radius)));
  return p[i].map((x,j)=>f(x+c.offset[j]));
 });
 const normals=c.refinedNormals.map((normal,i)=>queryMcmTerrainNormal({...c.terrain,point:contacts[i],normal}));
 const surfaces=contacts.map(point=>queryMcmTerrainHeight({...c.terrain,point}));
 const same=(a,b)=>a.every((x,i)=>x===b[i]);
 const selected=[false,false];
 for(let i=0;i<2;i++){
  const depth=f(surfaces[i][1]-contacts[i][1]),key=i?'rearTangent':'tangent';
  if(c.heights[i]<depth){
   selected[i]=true;p[6+i]=contacts[i];p[2+i]=surfaces[i];c.heights[i]=depth;p[4+i]=[...normals[i]];
   c[key]=same(result.probeNormals[i],normals[i])?tangents[i]:tangent(normals[i],p[8+i],i?c.bikeForward:result.forward);
  }else{
   const normal=i?result.rearResampleNormal:result.resampleNormal;
   if(!same(p[4+i],normal)){p[4+i]=[...normal];c[key]=tangent(normal,p[8+i],i?c.bikeForward:result.forward);}
  }
 }
 return {...result,probePoints:surfaces,refinedNormals:normals,refinedTangents:tangents,selected};
}
