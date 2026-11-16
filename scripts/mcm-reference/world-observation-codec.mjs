// Lossless deduplication of assertion targets, never simulation initialization.
// Long recordings repeat megabytes of animation allocation bytes per update.
export function encodeWorldAnimation(row,blocks,index){
 if(!row.animationState)return row;
 const animationStateRefs=row.animationState.map(block=>{
  const key=JSON.stringify(block);let id=index.get(key);
  if(id===undefined){id=blocks.length;blocks.push(block);index.set(key,id);}
  return id;
 });
 const {animationState,...rest}=row;return {...rest,animationStateRefs};
}
export function decodeWorldFrames(files){
 const blocks=files['world-animation-observations.json']?JSON.parse(files['world-animation-observations.json']):null;
 return files['frames.jsonl'].trim().split('\n').map(line=>{
  const row=JSON.parse(line);if(row.animationStateRefs===undefined)return row;
  if(row.animationState!==undefined||!Array.isArray(blocks)||!Array.isArray(row.animationStateRefs))throw Error('Invalid animation observation references');
  const {animationStateRefs,...rest}=row;
  return {...rest,animationState:animationStateRefs.map(id=>{
   if(!Number.isInteger(id)||id<0||id>=blocks.length)throw Error('Missing animation observation block');
   return blocks[id];
  })};
 });
}
