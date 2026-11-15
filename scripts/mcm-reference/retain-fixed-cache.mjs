import assert from 'node:assert/strict';

// Later snapshots are assertions against retained state, never fresh inputs.
// Callers may update this state only through a separately validated operation.
export function retainFixedCache(previous,row,label) {
 const nodes=new Map(row.nodes.map(n=>[n.id,n]));
 assert.equal(nodes.size,row.nodes.length,`Duplicate ${label} cache nodes`);
 if(previous){
  assert.equal(row.root,previous.root,`${label} cache root changed without modeled insertion`);
  assert.deepEqual(nodes,previous.nodes,`${label} cache changed without modeled insertion`);
  return previous;
 }
 return {root:row.root,nodes:new Map([...nodes].map(([id,n])=>[id,{...n,key:[...n.key]}]))};
}
