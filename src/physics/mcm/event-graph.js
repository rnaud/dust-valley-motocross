import {alignMcmEventRootOrientation} from './event-orientation.js';
import {applyMcmLocalChildTransform} from './local-child-transform.js';
import {applyMcmRelativeChildTransform} from './relative-child-transform.js';

// State adapter shared by original event and trick transitions.
export function createMcmEventGraph(s){
 const target={local:[...s.targetLocal],world:[...s.targetWorld],cacheValid:s.targetCache};
 const source={local:[...s.sourceLocal],world:[...s.sourceWorld],cacheValid:s.sourceCache};
 if(s.parented){source.parent=target;target.firstChild=source;}
 const components=(s.components||[]).map(n=>({local:[...n.local],world:[...n.world],cacheValid:n.cacheValid}));
 for(let i=0;i<components.length;i++){
  const parentIndex=s.components[i].parentIndex;
  if(parentIndex>=i)throw new RangeError('Component parents must precede their children');
  const node=components[i],parent=parentIndex<0?target:components[parentIndex];
  node.parent=parent;node.nextSibling=parent.firstChild;parent.firstChild=node;
 }
 const boundsChildren=(s.boundsChildren||[]).map(record=>({...record,forward:[...record.forward],up:[...record.up],position:[...record.position]}));
 return {target,source,components,boundsChildren};
}

// Original orientation reset and ordered bounds-child dispatch.
export function resetMcmEventOrientation(r,s){
 const {source,target,components,boundsChildren}=r;
  const axes=alignMcmEventRootOrientation(source,target);
  r.scratch540=axes.forward;r.scratch54c=axes.up;
  r.boundsMin=[...s.boundsMin];r.boundsMax=[...s.boundsMax];
  // Original 0x430970 traverses record+0x2c in list order and dispatches
  // the player's vtable+0x1c callback (0x44fa70) for each record.
  for(const record of boundsChildren){
   const node=components[record.componentIndex];
   if(!node)throw new RangeError('Unknown child component index');
   (record.local?applyMcmLocalChildTransform:applyMcmRelativeChildTransform)(target,node,record);
  }
  r.field820=0;
}
