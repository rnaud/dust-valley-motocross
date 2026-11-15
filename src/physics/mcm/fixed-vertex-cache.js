// 1d8c20 compares 44 bytes at node+10; d35de..d3635 traverses the tree.
export function lookupMcmFixedVertexCache(key,root,nodes) {
 if(key.length!==44)throw Error('Invalid fixed vertex descriptor');
 let node=root>>>0;const seen=new Set(),comparisons=[];
 while(node){
  if(seen.has(node))throw Error('Cyclic fixed vertex cache');seen.add(node);
  const entry=nodes.get(node);if(!entry||entry.key.length!==44)throw Error('Missing or invalid fixed vertex cache node');
  let result=0;for(let i=0;i<44;i++)if(key[i]!==entry.key[i]){result=key[i]<entry.key[i]?-1:1;break;}
  comparisons.push({node,result});if(!result)return {node,program:entry.program>>>0,comparisons};
  node=(result<0?entry.left:entry.right)>>>0;
 }
 return {node:0,program:null,comparisons};
}
