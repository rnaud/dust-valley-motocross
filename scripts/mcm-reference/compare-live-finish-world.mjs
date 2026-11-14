import {serializeLiveOrderedDispatch} from './compare-live-ordered-dispatch.mjs';
export function compareLiveFinishWorld(loaded,before,after,bike,rider){
 if(after?.captureId!==before.captureId||after.captureBoundary!=='player-substep-finish'||after.playerFrame!==0||after.bikeAddress!==before.bikeAddress)throw Error('Finish world boundary differs');
 // Bootstrap also loads physics-only nodes from the local checkpoint. The
 // world endpoint contains only the transform allocations in this observation.
 const observed=new Set(before.blocks.map(b=>b.address));
 const transformNodes=new Map([...loaded.ordered.transformNodes].filter(([address])=>observed.has(address)));
 const blocks=serializeLiveOrderedDispatch({...loaded.ordered,transformNodes},before);
 if(after.blocks.length!==blocks.length)throw Error('Finish world block count differs');
 const a=before.bikeAddress,riderAddress=loaded.ordered.actors.get(a).riderAddress;
 const differences=[];let comparedWords=0,changedWords=0;
 for(const block of blocks){
  const original=after.blocks.find(b=>b.address===block.address);if(!original||original.size!==block.size)throw Error('Finish world allocation differs');
  const expected=block.address===a?bike:block.address===riderAddress?rider:block.bytes;
  const previous=Buffer.from(block.hex,'hex'),actual=Buffer.from(original.hex,'hex');
  if(expected.length!==actual.length)throw Error('Finish world allocation size differs');
  for(let o=0;o<actual.length;o+=4){comparedWords++;const word=actual.readUInt32LE(o);if(word!==previous.readUInt32LE(o))changedWords++;
   if(word!==expected.readUInt32LE(o))differences.push({object:'collision-world',address:(block.address+o).toString(16),original:word,recovered:expected.readUInt32LE(o)});
  }
 }
 return {comparedWords,changedWords,differences,callbackTrace:loaded.ordered.trace};
}
