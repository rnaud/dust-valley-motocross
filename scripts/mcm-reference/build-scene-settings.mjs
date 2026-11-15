import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {readMcmSceneSettings,findMcmSceneFile} from './scene-settings.mjs';
const root=process.argv[2];if(!root)throw Error('Usage: build-scene-settings.mjs ORIGINAL_GAME');
const maps=JSON.parse(fs.readFileSync('docs/mcm-map-assets.json'));const result={};
for(const map of maps){const folder=path.join(root,path.dirname(map.source));const name=findMcmSceneFile(map.source,fs.readdirSync(folder));if(!name){result[map.id]=null;continue;}const bytes=fs.readFileSync(path.join(folder,name));result[map.id]={...readMcmSceneSettings(bytes.toString()),source:path.dirname(map.source)+'/'+name,sha256:createHash('sha256').update(bytes).digest('hex')};}
fs.writeFileSync('src/mcm-scene-settings.json',JSON.stringify(result,null,2)+'\n');console.log(`Imported ${maps.length} original scene settings`);

// Match variants by their declared terrain, never by a guessed filename prefix.
const variants={};
for(const map of maps){
 const folder=path.join(root,path.dirname(map.source));
 variants[map.id]=fs.readdirSync(folder).filter(name=>/\.scn$/i.test(name)).sort().flatMap(name=>{
  const bytes=fs.readFileSync(path.join(folder,name)),settings=readMcmSceneSettings(bytes.toString());
  if(settings.terrainFile?.split(/[\\/]/).at(-1).toLowerCase()!==path.basename(map.source).toLowerCase())return [];
  return [{...settings,source:path.dirname(map.source)+'/'+name,sha256:createHash('sha256').update(bytes).digest('hex')}];
 });
}
fs.writeFileSync('src/mcm-scene-variants.json',JSON.stringify(variants,null,2)+'\n');
