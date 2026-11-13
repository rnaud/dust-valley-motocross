import {selectMcmResetTerrain} from '../../src/physics/mcm/reset-terrain-selection.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
export function evaluateResetTerrainSelection(input){
 const words=[...input.words],g=input.values;
 const bike={position:g.slice(14,17),spawnPosition:g.slice(17,20),fieldbb8:g[5],field88c:g[6],savedHeading:g.slice(42,45),offset:words.slice(0x540/4,0x540/4+3).map(bitsFloat)};
 const others=Array.from({length:4},(_,j)=>({position:g.slice(21+j*4,24+j*4),fieldc30:g[24+j*4]}));
 const leaf={level:0,bias:g[38],scale:g[39],normals:Array.from({length:289},()=>[0,0,0]),heights:Array.from({length:289},(_,j)=>(g[37]+j*137)&65535)};
 const child={level:1,children:Array(256).fill(leaf)},root={level:2,children:Array(256).fill(child)};
 const nodes=Array.from({length:2},(_,j)=>({local:g.slice(47+j*33,63+j*33),world:g.slice(63+j*33,79+j*33),cacheValid:g[79+j*33]}));
 if(g[113]){nodes[1].parent=nodes[0];nodes[0].firstChild=nodes[1];}
 const position=g.slice(8,11),forward=g.slice(11,14);
 selectMcmResetTerrain({bike,targetNode:g[45]?nodes[1-g[46]]:null,mode:g[0],setting:g[1],playerCount:g[2],aiCount:g[3],enumerationDisabled:g[4],width:g[20],bikes:[bike,...others.slice(0,g[2]-1+g[3])],terrain:{root,worldToGrid:g[40],heightScale:g[41]}},position,g[7]?forward:null);
 words[0xbb8/4]=g[5];words[0x88c/4]=g[6];bike.position.forEach((v,j)=>{words[0x4f8/4+j]=floatBits(v);});bike.spawnPosition.forEach((v,j)=>{words[0xbc0/4+j]=floatBits(v);});
 bike.savedHeading.forEach((v,j)=>{words[0x898/4+j]=floatBits(v);});bike.offset.forEach((v,j)=>{words[0x540/4+j]=floatBits(v);});
 return [...words,...position.map(floatBits),...forward.map(floatBits),...others.flatMap(o=>[...o.position.map(floatBits),o.fieldc30]),...nodes.flatMap(n=>[...n.local.map(floatBits),...n.world.map(floatBits),n.cacheValid])];
}
