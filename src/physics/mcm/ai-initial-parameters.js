import {bitsFloat} from './math.js';
const f=Math.fround;
// Constructor 0x4a3289..0x4a32db; EBP-7c was f32(signed argument at EBP+60).
// Global lookahead is stored before it contributes to body+b5c.
export function initializeMcmAiParameters(worldHeight,argument){
 const lookahead=f(worldHeight*16);
 const jumpParameter=f((f(argument|0)*bitsFloat(0x3de978d5)-2)+lookahead*bitsFloat(0x3eaaaaab));
 return {lookahead,jumpParameter};
}
