import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
// Original 48ce60. All arithmetic stays at the original x87 precision until
// the comparison; grid coordinates use wrapped signed 32-bit shifts.
export function testMcmTerrainVertex(node,owner,bank,vertexRows,inverseDetail,x,y){
 const index=(vertexRows[y]+x)|0,offset=index<<4;
 const level=inverseDetail[bank.getUint8(offset+1)];
 if(!Number.isInteger(level))throw new Error('Missing terrain inverse-detail lookup');
 const shift=node.getUint8(0x24)&31;
 const gridX=(node.getInt32(0x28,true)+x)<<shift,gridZ=(node.getInt32(0x2c,true)+y)<<shift;
 const dx=sub(owner.getFloat32(0x48,true),gridX),dz=sub(owner.getFloat32(0x50,true),gridZ);
 const base=node.getFloat32(0xc,true),height=mul(sub(bank.getUint16(offset+2,true),base),node.getFloat32(0x10,true));
 const dy=sub(sub(owner.getFloat32(0x4c,true),height),base);
 const horizontal=add(mul(dx,dx),mul(dz,dz)),distance=add(mul(dy,dy),horizontal);
 const amplitude=mul(level,node.getFloat32(0x204,true));
 const left=mul(mul(horizontal,amplitude),amplitude),right=mul(mul(owner.getFloat32(0x60,true),distance),distance);
 owner.setUint32(0x88,(owner.getUint32(0x88,true)+1)>>>0,true);
 return Number.isNaN(left)||Number.isNaN(right)||left<=right?1:0;
}
