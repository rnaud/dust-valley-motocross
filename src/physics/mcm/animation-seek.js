import {setMcmLocalChildOrientation} from './local-child-transform.js';
import {setMcmRelativeChildOrientation} from './relative-child-transform.js';
import {setMcmPositionRelativeTo} from './position-transform.js';

// Bike vtable+0x14, original 0x44f8b0. Animation records mutate their axes.
export function applyMcmAnimationChild(body,components,record){
 const component=components[record.componentIndex&255];
 if(!component)throw new RangeError('Unknown animation component');
 if(record.local)setMcmLocalChildOrientation(component.node,record.forward,record.up);
 else setMcmRelativeChildOrientation(component.node,body,record.forward,record.up);
 if(component.positionEnabled)setMcmPositionRelativeTo(component.node,body,record.position);
}
// Original 0x44f960, vtable+0x18: remap the component and reflect x. Unlike
// the normal callback it normalizes temporary axes, preserving the source record.
export function applyMcmMirroredAnimationChild(body,components,remap,record){
 const index=record.componentIndex&255,component=components[remap[index]];
 if(!component)throw new RangeError('Unknown mirrored animation component');
 const forward=[-record.forward[0],record.forward[1],record.forward[2]];
 const up=[-record.up[0],record.up[1],record.up[2]];
 if(record.local)setMcmLocalChildOrientation(component.node,forward,up);
 else setMcmRelativeChildOrientation(component.node,body,forward,up);
 if(components[index].positionEnabled)setMcmPositionRelativeTo(component.node,body,[-record.position[0],record.position[1],record.position[2]]);
}
const nearestEven=x=>{
 const lo=Math.floor(x),part=x-lo;
 return part<.5?lo:part>.5?lo+1:lo%2===0?lo:lo+1;
};
// Original 0x430ab0. Retains other animation state, unlike 0x430a20.
// Callback is supplied because the original dispatches through the object's vtable.
export function seekMcmAnimation(object,record,fraction,applyChild){
 const index=nearestEven(Math.fround(((record.frameCount-1)|0)*fraction-.5));
 object.record=record;object.frame=record.firstFrame;
 while(object.frame&&object.frame.index!==index)object.frame=object.frame.next;
 if(!object.frame)throw new RangeError('Animation frame missing');
 object.boundsMin=[...object.frame.boundsMin];object.boundsMax=[...object.frame.boundsMax];
 for(let child=object.frame.firstChild;child;child=child.next)applyChild(child);
}
