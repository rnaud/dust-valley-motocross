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
