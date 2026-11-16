// Original 422ed0 and fade transition stores at 422fc7..42301a.
// Terrain occlusion is queried only at the retained four-draw cadence.
export function updateMcmSceneVisibility(view,query){
 const u=o=>view.getUint32(o,true),put=(o,v)=>view.setUint32(o,v>>>0,true);
 if(u(0xfc)===u(0x100)){
  if(typeof query!=='function')throw Error('Missing scene visibility terrain query');
  const hit=query();if(hit!==0&&hit!==1)throw Error('Invalid scene visibility terrain result');
  put(0x104,hit===1?0:1);
 }
 const counter=(u(0x100)+1)>>>0;put(0x100,(counter|0)>3?0:counter);
 const occluded=u(0x104)<1?1:0,previous=u(0x118);
 if(occluded&&!previous){put(0x108,1);put(0x10c,0);}
 else if(!occluded&&previous){put(0x10c,1);put(0x108,0);}
 put(0x118,occluded);
 return occluded;
}
