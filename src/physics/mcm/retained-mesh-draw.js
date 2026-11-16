import {composeMcmWrapperProduct} from './wrapper-product.js';
import {projectMcmBounds} from './projected-bounds.js';
import {resolveMcmWorldMatrix} from './world-transform.js';

// 445690's transform-query side effects, shared by actor and shape dispatch.
export function updateMcmMeshComponentCaches(groups,beforeQuery=()=>{}){
 const queries=[];
 for(const group of groups)for(const component of group){
  if(!component.count)continue;
  if(!component.node)throw Error('Missing mesh component node');
  let recursive=false;
  for(let current=component.node;current;current=current.cacheValid?null:current.parent){
   beforeQuery(current);queries.push({node:current.address,recursive});recursive=true;
  }
  resolveMcmWorldMatrix(component.node);
 }
 return queries;
}

// 44faf0 projection and 445690 component-cache side effects. Camera, viewport
// and draw invocation are explicit inputs; vertex buffers and device submission
// are outside this stage. Component destinations come from the mesh tables.
export function drawMcmRetainedMesh({node,center,extent,projection,viewport,mesh,selection,rendererMode}){
 const result=projectMcmBounds({matrix:composeMcmWrapperProduct(projection,node.local),center,extent,viewport});
 const queries=[];
 if(result.accepted&&selection.enabled&&selection.thresholds.length){
  const area=Math.imul((result.rect[3]-result.rect[1])|0,(result.rect[2]-result.rect[0])|0);
  let index=selection.index;
  for(let i=selection.thresholds.length-1;i>=0;i--)if(selection.thresholds[i]<area)index=i;
  if(index!==selection.index){
   selection.index=index;
   const set=(n,requested)=>{
    const state=mesh.lodNodes.get(n.address);if(!state)throw Error('Missing mesh LOD node');
    state.index=state.levels>requested?requested:state.levels-1;
    // The original passes each parent's clamped index to its children.
    for(let child=n.firstChild;child;child=child.nextSibling)set(child,state.index);
   };
   set(node,index);mesh.needsUpdate=1;
  }
 }
 if(result.accepted&&!mesh.hidden){
  if(!mesh.dispatchReady||!mesh.buffersReady)throw Error('Mesh loader/alternate dispatch is not connected');
  const groups=mesh.groups[mesh.lodNodes.get(node.address).index];if(!groups)throw Error('Missing selected mesh LOD');
  if(!rendererMode&&mesh.needsUpdate)queries.push(...updateMcmMeshComponentCaches(groups));
 }
 // Both 4465b0 and the wrapper's culled path set +180.
 mesh.needsUpdate=1;
 return {accepted:result.accepted,rect:result.rect,queries};
}
