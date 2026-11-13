import {resolveMcmWorldMatrix} from './world-transform.js';
import {updateMcmContactRollSubstep} from './contact-roll.js';
import {mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround;

// Original 0x4a692a..0x4a69e8. Mount transforms are resolved after the
// component rotation; querying cached pre-rotation positions changes levers.
export function prepareMcmContactGeometry(c){
 c.normal=resolveMcmWorldMatrix(c.rearMountNode).slice(12,15);
 c.rearLever=c.points[1].map((v,i)=>f(sub(v,c.normal[i])));
 c.normal=resolveMcmWorldMatrix(c.frontMountNode).slice(12,15);
 c.frontLever=c.points[0].map((v,i)=>f(sub(v,c.normal[i])));
 const a=c.tangent,b=c.points[4];
 c.frontAxis=new Float64Array(3);c.frontAxis[0]=f(sub(mul(a[1],b[2]),mul(a[2],b[1])));c.frontAxis[1]=f(sub(mul(a[2],b[0]),mul(a[0],b[2])));c.frontAxis[2]=f(sub(mul(a[0],b[1]),mul(a[1],b[0])));
}

export function updateMcmContactGeometrySubstep(c){
 const result=updateMcmContactRollSubstep(c);prepareMcmContactGeometry(c);return result;
}
