// Pinned wined3d 12fe0. Node layout: parent +0, left +4, right +8,
// flags +c (bit 0 is red), key +10. Allocation and shader compilation are callers.
export function insertMcmShaderCacheNode(tree,node,compare) {
 const nodes=tree.nodes,get=id=>nodes.get(id),red=id=>id!==0&&(get(id).flags&1)!==0;
 let parent=0,current=tree.root,order=0;
 while(current){
  parent=current;order=compare(node.key,get(current).key);
  if(order===0)return false;
  current=order<0?get(current).left:get(current).right;
 }
 if(nodes.has(node.id))throw Error('Shader cache node address already allocated');
 node={...node,parent,left:0,right:0,flags:1};nodes.set(node.id,node);
 if(!parent)tree.root=node.id;
 else get(parent)[order<0?'left':'right']=node.id;
 function rotate(id,left){
  const a=get(id),side=left?'right':'left',other=left?'left':'right',b=get(a[side]);
  a[side]=b[other];if(b[other])get(b[other]).parent=id;
  b.parent=a.parent;
  if(!a.parent)tree.root=b.id;
  else get(a.parent)[get(a.parent).left===id?'left':'right']=b.id;
  b[other]=id;a.parent=b.id;
 }
 let id=node.id;
 while(get(id).parent&&red(get(id).parent)){
  let p=get(id).parent,g=get(p).parent;
  const left=get(g).left===p,uncle=get(g)[left?'right':'left'];
  if(red(uncle)){
   get(g).flags^=1;get(p).flags^=1;get(uncle).flags^=1;id=g;continue;
  }
  if(get(p)[left?'right':'left']===id){rotate(p,left);id=p;}
  p=get(id).parent;g=get(p).parent;
  get(p).flags&=~1;get(g).flags|=1;rotate(g,!left);
 }
 get(tree.root).flags&=~1;
 return true;
}
