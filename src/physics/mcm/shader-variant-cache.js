// Pinned wined3d 725a0 (vertex) / 71020 (pixel), lookup only.
// Creation on absent/empty/missed arrays is an explicit caller boundary.
const word=(b,i)=>(b[i]|b[i+1]<<8|b[i+2]<<16|b[i+3]<<24)>>>0;
export function lookupMcmShaderVariant({kind,mask=0xffffffff,query,entries}) {
 if(kind!==0&&kind!==4)throw Error('Unsupported shader variant kind');
 const size=kind===0?24:52;
 if(query.length!==size)throw Error('Invalid shader variant query');
 if(entries===null)return null;
 for(let index=0;index<entries.length;index++){
  const e=entries[index];if(e.length!==size+4)throw Error('Invalid shader variant entry');
  let match;
  if(kind===0){
   match=((word(e,0)&mask)>>>0)===word(query,0)&&((e[21]^query[21])&0x3f)===0&&e[20]===query[20];
   for(const at of [4,8,12,16])match=match&&word(e,at)===word(query,at);
  }else match=query.every((v,i)=>v===e[i]);
  if(match)return {index,id:word(e,size)};
 }
 return null;
}
