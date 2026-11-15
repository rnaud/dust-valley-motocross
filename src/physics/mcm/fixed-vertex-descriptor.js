// Pinned wined3d 1d8600: fixed-function vertex shader descriptor (44 bytes).
// declaration: bytes +18..1d; capabilities: bytes +54..55.
// state[0..13]: DWORD offsets below; state[14..17]: bytes +1c1c..1c1f.
// textureCoordinates: DWORDs +13ec + i*48; lights: types of non-null
// state+1894 pointers (null slots may use ffffffff); streamFlags: stream+384.
export const mcmFixedVertexStateOffsets=[0x1b10,0x1af0,0x1ad8,0x1aec,0x1928,0x1a4,0x1ae8,0x1af8,0x1b04,0x1b00,0x1afc,0x1924,0x1ae4,0x1974];
export function mcmFixedVertexDescriptor({declaration,state,textureCoordinates,lights,capabilities,streamFlags}) {
 const d=declaration,s=Array.from(state,v=>v>>>0),out=new Uint8Array(44),view=new DataView(out.buffer);
 const transformed=!!d[0];
 out[3]=transformed?1:((s[0]<=3?s[0]<<1:0)|((!!s[14])<<3)|((d[4]&1)<<4)|((!!((d[4]&1)&&s[1]))<<5)|((!!s[2])<<6)|((!!s[3])<<7));
 out[4]=(s[5]===1?1:0)|((d[1]&1)<<1);
 out[5]=(d[2]<<7)|(!transformed&&s[4]?0x40:0);
 if(!transformed){
  if(!s[2])out[2]=0x81;
  else if(s[6]){
   const select=v=>v===1?d[2]&3:v===2?(d[3]<<1)&2:0;
   out[2]=select(s[7])|(select(s[8])<<2)|(select(s[9])<<4)|(select(s[10])<<6);
  }
 }
 let textureMask=0;
 for(let i=0;i<8;i++){
  const index=textureCoordinates[i]>>>0;view.setUint32(12+i*4,index,true);
  if(index<=7&&((d[5]>>>index)&1))textureMask|=1<<i;
 }
 if(capabilities[1]&0x80)textureMask=0xff;
 out[4]|=(textureMask<<4)&0xff;out[5]|=textureMask>>>4;
 if(transformed){if(s[11])out[4]|=s[15]?8:4;}
 else{
  for(const type of lights){
   if(type===1)out[0]=(out[0]&0xf0)|((out[0]+1)&15);
   else if(type===2)out[0]+=16;
   else if(type===3)out[1]=(out[1]&0xf0)|((out[1]+1)&15);
   else if(type===4)out[1]+=16;
  }
  if(s[11]){
   if(s[15]){out[4]|=8;out[5]|=(s[17]&1)<<4;}
   else out[4]|=!s[12]?4:s[13]?12:8;
  }
 }
 if(capabilities[0]&1)out[5]|=(s[16]&1)<<5;
 view.setUint32(8,streamFlags>>>0,true);
 return out;
}
