import {createWineHeapRegion} from './wine-heap-region.mjs';
export function createRiderHeapNeighborhood(initial){
 const bs=initial.blocks;let lo=bs.findIndex(b=>b.header===initial.anchor),hi=lo;
 if(lo<0)throw Error('Missing rider-adjacent header');
 while(lo>0&&!(bs[lo-1].words[1]>>>24&128))lo--;
 while(hi<bs.length-1&&!(bs[hi+1].words[1]>>>24&128))hi++;
 if(!lo||hi===bs.length-1)throw Error('Missing bounding opaque blocks');
 const blocks=bs.slice(lo-1,hi+2).map(b=>({pointer:b.header+8,bytes:(b.words[1]>>>24&1?b.words[0]:b.words[0]&65535)*8,regionOffset:b.words[1]&65535,free:!!(b.words[1]>>>24&1)}));
 const model=createWineHeapRegion(blocks);let updates=0;
 const contains=p=>p>=blocks[1].pointer&&p<blocks.at(-1).pointer;
 return {child:initial.child,words:()=>model.words(initial.anchor+8),
  malloc(pointer,size){if(contains(pointer)){model.allocateAt(pointer,size);updates++;}},
  free(pointer){if(contains(pointer)){model.free(pointer);updates++;}},
  get updates(){return updates;},
 };
}
export function connectWorldRiderHeap(files){
 const models=[0,1].map(i=>createRiderHeapNeighborhood(JSON.parse(files[`world-rider-heap-${i}.json`])));
 return {
  malloc(pointer,size){for(const m of models)m.malloc(pointer,size);},
  free(pointer){for(const m of models)m.free(pointer);},
  words(child){const m=models.find(m=>m.child===child);if(!m)throw Error('Uncaptured rider heap');return m.words();},
  report(){return models.map(m=>({child:m.child,updates:m.updates}));},
 };
}
