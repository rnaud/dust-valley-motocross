import {drawMcmMarker,drawMcmShape} from '../../src/physics/mcm/marker-draw.js';
export function buildMarkerDrawCases(){
 const cases=[];let seed=0x446220;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<2048;i++){
  const b=Buffer.alloc(53*4),put=(n,v)=>b.writeUInt32LE(v>>>0,n*4),set=(n,v)=>b.writeFloatLE(v,n*4);
  for(let j=0;j<32;j++)set(j,0);
  for(const base of [0,16])for(let j=0;j<4;j++)set(base+j*5,1);
  const variant=i>>6;
  if(variant%4===0){for(let j=0;j<32;j++)set(j,(random()-.5)*4);}
  else{set(12,variant%4===1?.5:variant%4===2?8:-8);set(13,.5);set(14,.5);}
  for(let j=0;j<3;j++){set(32+j,variant%4===0?random()-.5:0);set(35+j,.02+random()*.2);}
  [10,20,640,480].forEach((v,j)=>put(38+j,v));
  for(let j=0;j<6;j++)put(42+j,(i>>j)&1);
  put(48,0x12345678);[111,222,333,444].forEach((v,j)=>put(49+j,v));cases.push(b);
 }
 return Buffer.concat(cases);
}
export function compareMarkerDraw(input,output){
 if(input.length%(53*4)||output.length!==input.length/(53*4)*36)throw Error('Invalid marker draw oracle sizes');
 const differences=[],outcomes={};let comparedWords=0;
 for(let i=0;i<input.length/(53*4);i++){
  const b=input.subarray(i*53*4,(i+1)*53*4),u=n=>b.readUInt32LE(n*4),floats=(n,count)=>Array.from({length:count},(_,j)=>b.readFloatLE((n+j)*4));
  const marker=new DataView(new ArrayBuffer(0xa4));marker.setUint32(0x70,u(42),true);marker.setUint32(0x34,u(43),true);
  const mesh={hidden:u(45),dispatchReady:u(46),buffersReady:u(47),needsUpdate:u(48),rect:[49,50,51,52].map(u)},calls=[0,0,0];
  const result=drawMcmMarker(marker,()=>{
   if(u(44))drawMcmShape({node:{local:floats(0,16)},mesh,projection:floats(16,16),viewport:[38,39,40,41].map(u),bounds:()=>({center:floats(32,3),extent:floats(35,3)})},{draw:()=>calls[0]++,load:()=>calls[1]++,alternate:()=>calls[2]++});
   return 1;
  });
  const words=[result,mesh.needsUpdate,...mesh.rect,...calls];const key=calls.join(':');outcomes[key]=(outcomes[key]??0)+1;
  for(let j=0;j<9;j++){comparedWords++;const expected=output.readUInt32LE(i*36+j*4),actual=words[j]>>>0;if(actual!==expected)differences.push({case:i,word:j,actual,expected});}
 }
 return {cases:input.length/(53*4),comparedWords,outcomes,differences};
}
