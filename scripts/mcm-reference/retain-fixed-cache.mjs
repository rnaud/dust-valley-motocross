import assert from 'node:assert/strict';

// No insertion model yet: later snapshots are assertions against the retained
// initial tree, never fresh inputs that could hide an unexplained cache change.
export function retainFixedCache(previous,row,label) {
 const nodes=new Map(row.nodes.map(n=>[n.id,n]));
 assert.equal(nodes.size,row.nodes.length,`Duplicate ${label} cache nodes`);
 if(previous){
  assert.equal(row.root,previous.root,`${label} cache root changed without modeled insertion`);
  assert.deepEqual(nodes,previous.nodes,`${label} cache changed without modeled insertion`);
  return previous;
 }
 return {root:row.root,nodes};
}
