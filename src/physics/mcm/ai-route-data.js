// Original optional .aid loader 0x46bdc0. Nodes are arrays of eleven DWORDs.
// The file's actor index is validated but does not select an actor: the original
// advances the world's actor list in order. Failed reads retain partial writes.
export function applyMcmAiRouteData(bytes,actors,actorLimit){
 if(bytes===null)return {loaded:false,bytesRead:0,closed:false};
 let position=0;const read=()=>{const start=position;position=Math.min(position+4,bytes.length);if(position-start<4)return null;return (bytes[start]|bytes[start+1]<<8|bytes[start+2]<<16|bytes[start+3]<<24)>>>0;};
 const finish=loaded=>({loaded,bytesRead:position,closed:true});
 let count=read();if(count===null||(count|0)<0||count>=11)return finish(false);
 const limit=(actorLimit<<16)>>16;if(count>limit)count=limit;
 for(let a=0;a<count;a++){
  const index=read();if(index===null||(index|0)<0||index>10)return finish(false);
  const size=read();if(size===null||size!==actors[a].routeCount)return finish(false);
  for(let n=0;n<(size|0);n++)for(const offset of [5,6,7,9]){
   const node=actors[a].nodes[n],start=position;let word=node[offset]>>>0;
   for(let i=0;i<4&&position<bytes.length;i++,position++)word=((word&~(255<<(i*8)))|(bytes[position]<<(i*8)))>>>0;
   node[offset]=word;if(position-start<4)return finish(false);
  }
 }
 return finish(true);
}
export function loadMcmAiRouteData({folder,name,actors,actorLimit,readFile}){
 return applyMcmAiRouteData(readFile(`${folder}\\${name}.aid`),actors,actorLimit);
}
