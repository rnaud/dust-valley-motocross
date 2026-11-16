import {mcmDivide} from './x87-arithmetic.js';
// Original 4112f0. Integer squares wrap before conversion to x87; reciprocal
// calculations reload the rounded single-precision stores.
export function updateMcmTerrainDetail(view){
 const mode=view.getInt32(0x54,true),focal=view.getInt32(0x58,true);
 view.setFloat32(0x60,mcmDivide(Math.imul(mode,mode),Math.imul(focal,focal)),true);
 view.setFloat32(0x64,mcmDivide(1,view.getFloat32(0x60,true)),true);
 view.setFloat32(0x5c,mcmDivide(mode,focal),true);
 view.setFloat32(0x68,mcmDivide(1,view.getFloat32(0x5c,true)),true);
}
