import {mcmDivide,mcmMultiply} from './x87-arithmetic.js';
import {updateMcmTerrainDetail} from './terrain-detail.js';
const integer=x=>{
 const lo=Math.floor(x),fraction=x-lo,rounded=fraction<.5?lo:fraction>.5?lo+1:lo%2===0?lo:lo+1;
 return Number.isFinite(rounded)&&rounded>=-2147483648&&rounded<=2147483647?rounded:-2147483648;
};
// Camera/detail portion of 4125b0 through 4126c8, before terrain traversal.
// The caller owns the two global counter resets and platform clock reads.
export function setupMcmTerrainView(view,camera,mode){
 for(let offset=0x88;offset<=0xb4;offset+=4)view.setUint32(offset,0,true);
 const scale=view.getFloat32(0x40,true);
 camera.position.forEach((value,i)=>view.setFloat32(0x48+i*4,mcmDivide(Math.fround(value),scale),true));
 const angle=mcmMultiply(mcmMultiply(Math.fround(camera.fov),.01745329),.5);
 const focal=Math.fround(mcmDivide((camera.width>>>0)>>>1,Math.tan(angle)));
 view.setInt32(0x58,integer(focal),true);view.setUint32(0x54,mode>>>0,true);
 updateMcmTerrainDetail(view);
}
