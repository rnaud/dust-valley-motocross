import {drawMcmChildren,mcmSceneRootEntryEsp} from './child-draw.js';
// Actor projection only. Other virtual callbacks remain explicit boundaries.
export function predictMcmSceneActors({root,nodes,worldEntryEsp,ownerDrawTarget,opaqueDraw}) {
  if(ownerDrawTarget!==0x467a90)throw Error('Unrecovered outer scene draw');
  const wrappers=[],opaque=[],calls=[],active=new Set();
  const get=address=>{const n=nodes.get(address);if(!n)throw Error('Missing scene node');return n;};
  const hasActor=(address,seen=new Set())=>{
    if(!address)return false;if(seen.has(address))throw Error('Cyclic scene subtree');seen.add(address);
    const n=get(address);return n.target===0x44faf0||hasActor(n.child,seen)||hasActor(n.next,seen);
  };
  const view=(address,seen=new Set())=>{
    if(!address)return null;if(seen.has(address))throw Error('Cyclic child list');seen.add(address);
    return {address,get removed(){return get(address).removed;},get enabled(){return get(address).enabled;},
      get next(){return view(get(address).next,seen);}};
  };
  const visit=(address,esp)=>{
    if(active.has(address))throw Error('Cyclic scene traversal');active.add(address);
    const n=get(address),call={address,target:n.target,esp};calls.push(call);let childEsp,result;
    if(n.target===0x44faf0){wrappers.push({actor:(address-0x404)>>>0,esp});childEsp=(esp-0xf8)>>>0;}
    else if(n.target===0x4206c0||n.target===0x481300)childEsp=(esp-12)>>>0;
    else{
      if(hasActor(n.child))throw Error('Unmodeled callback owns actor descendants');
      result=opaqueDraw(n);if(!Number.isInteger(result)||result<0||result>0xffffffff)throw Error('Missing opaque callback result');
      opaque.push({address,target:n.target,result});call.result=result;active.delete(address);return result;
    }
    const visited=new Set();
    result=drawMcmChildren({child:view(n.child)},{
      unlink:()=>{throw Error('Scene unlink effects are not recovered');},
      destroy:()=>{throw Error('Scene destruction effects are not recovered');},
      draw:child=>{
        if(visited.has(child.address))throw Error('Cyclic child list');visited.add(child.address);
        return visit(child.address,childEsp);
      }
    });
    active.delete(address);
    // 44ff90 forces success after its child traversal, regardless of its result.
    call.result=n.target===0x44faf0?1:result;return call.result;
  };
  const result=visit(root,mcmSceneRootEntryEsp(worldEntryEsp));return {result,wrappers,opaque,calls};
}
