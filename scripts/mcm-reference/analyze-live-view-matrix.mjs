import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {composeMcmViewMatrix} from '../../src/physics/mcm/view-matrix.js';
import {multiplyWineRenderMatrix} from '../../src/physics/mcm/wine-render-matrix.js';
const floats=words=>new Float32Array(Uint32Array.from(words).buffer);
const bits=values=>Array.from(new Uint32Array(values.buffer));
export function analyzeLiveViewMatrix(rows){
 const pending=new Map(),views=new Map();let viewPairs=0,viewWords=0,viewSubmissions=0,products=0,productWords=0,ignoredViewSubmissions=0,ignoredProducts=0;
 let retainedView=null,retainedWorld=null,product=null;
 for(const row of rows){
  if(row.phase==='before-view'){
   assert.ok(!pending.has(row.camera),'Unpaired camera entry');assert.equal(row.words.length,10);
   pending.set(row.camera,{frame:row.frame,result:bits(composeMcmViewMatrix(floats(row.words)))});
  }else if(row.phase==='after-view'){
   const p=pending.get(row.camera);assert.ok(p,'Missing camera entry');assert.equal(p.frame,row.frame);
   assert.deepEqual(row.words,p.result,'Native view differs');views.set(row.camera+0x70,p.result);pending.delete(row.camera);viewPairs++;viewWords+=16;
  }else if(row.phase==='set-transform'){
   if(row.transform===2){
    const v=views.get(row.matrixAddress);retainedView=v??null;
    if(v){assert.deepEqual(row.words,v,'View submission differs');viewSubmissions++;}else ignoredViewSubmissions++;
   }else if(row.transform===256){assert.equal(row.words.length,16);retainedWorld=row.words;}
  }else if(row.phase==='before-product'){
   assert.equal(product,null,'Unpaired product');
   if(retainedView&&retainedWorld){
    assert.deepEqual(row.words,[...retainedView,...retainedWorld],'Product inputs differ from retained setters');
    product={frame:row.frame,destination:row.destination,expected:bits(multiplyWineRenderMatrix(floats(retainedView),floats(retainedWorld)))};
   }else{ignoredProducts++;product={ignored:true};}
  }else if(row.phase==='after-product'){
   assert.ok(product,'Missing product entry');
   if(!product.ignored){assert.equal(row.frame,product.frame);assert.equal(row.destination,product.destination);assert.deepEqual(row.words,product.expected,'Derived product differs');products++;productWords+=16;}
   product=null;
  }
 }
 assert.equal(pending.size,0,'Incomplete camera pair');assert.equal(product,null,'Incomplete product pair');
 return {viewPairs,viewWords,viewSubmissions,products,productWords,ignoredViewSubmissions,ignoredProducts};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(analyzeLiveViewMatrix(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse)),null,2));
