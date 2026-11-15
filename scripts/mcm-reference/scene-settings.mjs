// SCN files are INI-like; comments and repeated light sections must stay distinct.
export function readMcmSceneSettings(text){
 const sections={};let section=null;
 for(const raw of text.split(/\r?\n/)){
  const line=raw.split(';')[0].trim();if(!line)continue;
  const heading=line.match(/^\[([^\]]+)\]$/);if(heading){section=sections[heading[1].toLowerCase()]??={};continue;}
  const at=line.indexOf('=');if(section&&at>=0)section[line.slice(0,at).trim().toLowerCase()]=line.slice(at+1).trim();
 }
 const vector=value=>{if(!value)return null;const v=value.split(',').map(Number);if(v.length!==3||!v.every(Number.isFinite))throw Error('Invalid scene vector');return v;};
 return {title:sections.sceneinfo?.scenename??null,skyCube:sections.environment?.cubefile??null,fogColor:vector(sections.fog?.colorrgb),defaultStartPosition:vector(sections.sceneinfo?.defaultstartposition),defaultStartDirection:vector(sections.sceneinfo?.defaultstartdirection),lights:Object.entries(sections).filter(([key])=>/^light\d+$/.test(key)).map(([,s])=>({type:s.type,color:vector(s.colorrgb),position:vector(s.position),target:vector(s.targetposition),castsShadows:s.castsshadows==='T',atInfinity:s.placelightatinfinity!=='F'}))};
}
