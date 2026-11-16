import test from 'node:test';
import assert from 'node:assert/strict';
import {connectWorldCameraVisibility} from '../scripts/mcm-reference/world-camera-visibility.mjs';
const meshes = () => ({actors:new Map([[1,{node:{address:100},mesh:{hidden:0}}],[2,{node:{address:200},mesh:{hidden:1}}]])});
test('camera visibility shares mesh words through initialization and later camera updates',()=>{
 const m=meshes();let state=null;
 const visibility=connectWorldCameraVisibility(m,[100,200],[0,1],()=>state);
 assert.equal(visibility.get(100)(),0);assert.equal(m.actors.get(2).mesh.hidden,1);
 state={nodes:[{flag12c:1},{flag12c:0}]};
 assert.equal(m.actors.get(1).mesh.hidden,1);assert.equal(visibility.get(200)(),0);
 state.nodes[0].flag12c=0;assert.equal(m.actors.get(1).mesh.hidden,0);
});
test('camera visibility refuses disconnected or inconsistent mesh initialization',()=>{
 assert.throws(()=>connectWorldCameraVisibility(meshes(),[100,300],[0,1],()=>null),/Missing or ambiguous/);
 assert.throws(()=>connectWorldCameraVisibility(meshes(),[100,200],[1,1],()=>null),/initial visibility differs/);
 assert.throws(()=>connectWorldCameraVisibility(meshes(),[100,100],[0,0],()=>null),/overlap/);
});
