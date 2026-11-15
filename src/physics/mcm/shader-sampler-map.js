// Pinned Wine 1a43e0 -> 1db660, logging disabled. Legacy shaders retain
// the context map; modern shader ranges use direct texture-unit indices.
export function mcmShaderSamplerMap(context,shader=context.shader) {
 const map=context.samplerMap;
 if(shader==null)return {first:0,count:8,map};
 const type=shader.type>>>0;
 if(((shader.major>>>0)&255)<=3){
  if(type===0)return {first:0,count:16,map};
  if(type===1)return {first:16,count:4,map};
  return {first:0,count:0,map};
 }
 const gl=context.glInfo;
 if(type===5){
  const offset=gl.computeSamplerOffset>>>0;
  return {first:offset===(gl.unitLimit>>>0)?0:offset,count:gl.computeSamplerCount>>>0,map:null};
 }
 let first=0;
 for(let stage=0;stage<5;stage++){
  const count=gl.stageSamplerCounts[stage]>>>0;
  if(type===stage)return {first,count,map:null};
  first=(first+count)>>>0;
 }
 return {first,count:0,map:null};
}
