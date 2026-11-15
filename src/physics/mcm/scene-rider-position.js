import {resolveMcmWorldMatrix} from './world-transform.js';

// Original 0x422f50..0x422fad: three gates, then bike+874 -> rider+fc
// queried relative to world (null reference). The later visibility test and
// scene-object state transitions are separate, still unconnected boundaries.
export function queryMcmSceneRiderPosition(state){
 if(!state.enabled||state.disabled||state.bike.fieldc30)return {position:null,nodes:[]};
 const node=state.riderPoint;
 if(!node)throw Error('Missing scene rider position node');
 // Expose the resolver's computed call chain for assertions, including the
 // first valid parent. No observed target or matrix selects these calls.
 const nodes=[];
 for(let current=node;current;current=current.cacheValid?null:current.parent)nodes.push(current.address);
 const matrix=resolveMcmWorldMatrix(node);
 return {position:new Float64Array(matrix.slice(12,15)),nodes};
}
