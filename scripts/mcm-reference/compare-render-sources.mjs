import {compareLiveRetainedRiderFrames} from './compare-live-retained-rider-frames.mjs';

// Observe recovered outputs only. Native samples never enter the stepping context.
export function compareRenderSources(input,rows,events){
 let words=0,differences=0,bikeSamples=0,riderSamples=0;const firstDifferences=[];
 const replay=compareLiveRetainedRiderFrames(input,rows,events,{onBikeReturn:({frame,after,sources})=>{
  for(const source of sources){
   const bike=source.actor===parseInt(after.bike,16);
   if(!bike&&!after.visualState)continue; // Sparse visual capture, not inferred coverage.
   const node=bike?{hex:'00'.repeat(0x84)+after.matrixHex}:after.visualState.find(b=>b.address===source.node);
   const actor=bike?{hex:after.stateHex}:after.visualState.find(b=>b.address===source.actor);
   if(!node||!actor)throw Error('Missing wrapper source allocation');
   if(bike){if(source.node!==parseInt(after.transformAddress,16))throw Error('Wrapper node ownership differs');bikeSamples++;}else riderSamples++;
   for(const [values,allocation,offset]of [[source.local,node,0x84],[source.center,actor,0x218],[source.extent,actor,0x224]]){
    const native=Buffer.from(allocation.hex,'hex'),computed=new Uint32Array(values.buffer,values.byteOffset,values.length);
    if(native.length<offset+computed.length*4)throw Error('Truncated wrapper source allocation');
    for(let i=0;i<computed.length;i++){
     words++;const original=native.readUInt32LE(offset+i*4),recovered=computed[i];
     if(original!==recovered){differences++;if(firstDifferences.length<20)firstDifferences.push({frame,actor:source.actor,offset:offset+i*4,original,recovered});}
    }
   }
  }
 }});
 return {words,differences,bikeSamples,riderSamples,firstDifferences,bikeFrames:replay.bikeFrames,physicsDifferences:replay.physicsDifferences};
}
