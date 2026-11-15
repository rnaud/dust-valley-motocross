// Pinned wined3d comparator 86760; keys use logical DWORD order 0..5.
// The node fields are at +18,+69c,+6a8,+6b8,+6c8,+b74 respectively.
const order=[0,3,4,1,2,5];
export function compareMcmShaderProgramKey(key,nodeKey) {
 if(key.length!==6||nodeKey.length!==6)throw Error('Invalid shader program key');
 for(const i of order){const a=key[i]>>>0,b=nodeKey[i]>>>0;if(a!==b)return a>b?1:-1;}
 return 0;
}
// d3526..d355f lookup branch only. Key production, the zero-shader gate,
// cache insertion and program creation remain outside this operation.
export function lookupMcmShaderProgramCache(key,root,nodes) {
 let node=root>>>0;const seen=new Set(),comparisons=[];
 while(node){
  if(seen.has(node))throw Error('Cyclic shader program cache');seen.add(node);
  const entry=nodes.get(node);if(!entry)throw Error('Missing shader program cache node');
  const result=compareMcmShaderProgramKey(key,entry.key);comparisons.push({node,result});
  if(result===0)return {node,comparisons};
  node=(result<0?entry.left:entry.right)>>>0;
 }
 return {node:0,comparisons};
}
