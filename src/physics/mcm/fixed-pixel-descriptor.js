// Pinned wined3d 1d7ec0 and its intact b04c0 texture-argument predicate.
const argumentMasks=[0,0,1,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,7,7];
function invalidTextureArguments(present,[op,a,b,c]){
 if(op===1||present)return false;
 if((a&15)===2)return op!==3||(b&15)===2;
 if((b&15)===2)return op!==2;
 return (c&15)===2&&(op===25||op===26);
}
export function mcmFixedPixelDescriptor(c){
 const {stages,textures,stageCount,cap30,cap51,cap54,cap55,stateBytes}=c;
 if(c.seed.length!==132||stageCount<0||stageCount>8||!Number.isInteger(stageCount))throw Error('Invalid pixel descriptor input');
 const out=Uint8Array.from(c.seed);out[131]&=0x3f;
 const operation=(s,alpha)=>{const op=s[alpha?3:0]>>>0,mask=argumentMasks[op];if(mask===undefined)throw Error('Invalid texture operation');return [op,mask&1?s[alpha?4:1]>>>0:255,mask&2?s[alpha?5:2]>>>0:255,mask&4?s[alpha?15:14]>>>0:255];};
 let i=0;
 for(;i<stageCount;i++){
  const s=stages[i],t=textures[i],at=i*16,present=!!(t.view&&t.resource);
  out[at+12]&=31;out[at+13]=0;
  if(s[0]===1){out.set([1,255,255,255,1,255,255,255,100,168],at);out[at+12]=0;i++;break;}
  let format=0xa864,type=0;
  if(present){const lo=t.format&255,hi=t.format>>>8&255;format=(cap55&8)&&((~lo)&12)&&!((lo|hi)&17)?0xa864:t.format;type=t.type&7;}
  out[at+8]=format;out[at+9]=format>>>8;
  let color=operation(s,false),alpha;
  if(invalidTextureArguments(present,color)){color=[2,1,255,255];alpha=operation(s,true);}
  else alpha=color[0]===24?[...color]:operation(s,true);
  if(invalidTextureArguments(present,alpha))alpha=[2,1,255,255];
  out.set(color.map(v=>v&255),at);out.set(alpha.map(v=>v&255),at+4);
  const usesTexture=[...color.slice(1),...alpha.slice(1)].some(v=>v===2);
  out[at+12]=type|(s[16]===5?8:0)|(usesTexture?((s[13]>>>8)&1)<<4:0);
 }
 out.fill(255,i*16,128);
 if(!stateBytes[2])out[128]=0;
 else{
  let mode=c.fogMode>>>0;
  if(mode===0){if(c.vertexShader||c.transformed)mode=3;else mode=c.fogFallback>>>0;}
  if(mode===0||mode===3)out[128]=1;
  else if(mode===1)out[128]=2;
  else if(mode===2)out[128]=3;
 }
 out[129]=(cap55&32)||((cap51&2)&&!stateBytes[3])?0:c.declarationPresent?(c.declarationFlags>>>1)&1:0;
 const first=textures[0];
 out[131]=(out[131]&254)|(c.colorKey&&first.view&&first.resource&&(first.flags&8)&&out[0]!==1?1:0);
 out[130]=255;
 if(cap30&&!(cap55&128)){
  out[130]=0;
  for(let j=0;j<8;j++){
   const coord=stages[j][10]>>>0;
   const enabled=c.vertexShader&&!c.transformed?((c.vertexMask>>>j)&1):(coord&0xff0000)||(coord<=7&&((c.textureCoordinateMask>>>coord)&1));
   if(enabled)out[130]|=1<<j;
  }
 }
 out[131]=(out[131]&253)|(stateBytes[0]&&c.rasterMode===1?2:0);
 out[131]=(out[131]&199)|(((cap54&2)?7:((c.alphaFunction-1)>>>0)&7)<<3);
 out[131]=(out[131]&251)|((cap54&1)?(stateBytes[1]&1)<<2:0);
 return out;
}
