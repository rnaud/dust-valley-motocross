import {findMcmNearestAiRoute} from '../../src/physics/mcm/ai-route-nearest.js';
export function generateAiRouteNearestCases(){
const N=4096,input=Buffer.alloc(N*268),expected=Buffer.alloc(N*12),b=x=>new Uint32Array(Float32Array.of(x).buffer)[0],f=x=>new Float32Array(Uint32Array.of(x).buffer)[0];let seed=0x91f4a62;
const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};const special=[0,0x80000000,b(1000),b(-1000),b(1000000),b(.001),0x7f800000,0xff800000,0x7fc00000];
for(let c=0;c<N;c++){
 const words=new Uint32Array(67);words[0]=c%33;words[1]=b((random()%100000-50000)/16);words[2]=b((random()%100000-50000)/16);
 const nodes=new Map();
 for(let i=0;i<32;i++){let x=b((random()%100000-50000)/16),z=b((random()%100000-50000)/16);if(c%5===0){x=special[random()%special.length];z=special[random()%special.length];}if(c%7===0&&i){x=words[3];z=words[4];}words[3+i*2]=x;words[4+i*2]=z;if(i<words[0])nodes.set(i+1,{x:f(x),z:f(z),next:i+1<words[0]?i+2:0});}
 words.forEach((w,i)=>input.writeUInt32LE(w,c*268+i*4));const r=findMcmNearestAiRoute({head:words[0]?1:0,nodes,x:f(words[1]),z:f(words[2])});[r.address,r.index,b(r.distance)].forEach((w,i)=>expected.writeUInt32LE(w,c*12+i*4));
}
return {input,expected};
}
