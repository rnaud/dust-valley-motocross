import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {loadLiveAnimationAssets} from './animation-assets-loader.mjs';
export {loadLiveAnimationAssets,loadLiveAnimationState} from './animation-assets-loader.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const observation=JSON.parse(fs.readFileSync(process.argv[2])),loaded=loadLiveAnimationAssets(observation);
 console.log(JSON.stringify({scope:'Read-only animation dependency observation; not an atomic replay checkpoint.',records:loaded.records.length,frames:loaded.frames.size,children:loaded.children.size,frameCounts:loaded.records.map(r=>r.frameCount),frameRates:loaded.records.map(r=>r.fps)},null,2));
}
