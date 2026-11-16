import {updateMcmCollisionGrid} from '../../src/physics/mcm/collision-grid.js';
import {primaryMcmNormalRiderCollision} from '../../src/physics/mcm/rider-normal-collision.js';
import {bitsFloat,floatBits} from '../../src/physics/mcm/math.js';
export function compareRiderNormalPrimary(input,output){
 const count=input.readUInt32LE();if(input.length!==4+count*61*4||output.length!==36+count*86*4)throw Error('Invalid primary rider corpus');
 const coefficients=Array.from({length:6},(_,i)=>output.readFloatLE(i*4)),zero=Array.from({length:3},(_,i)=>output.readFloatLE(24+i*4)),differences=[];
 for(let row=0;row<count;row++){
  const u=i=>input.readUInt32LE(4+row*244+i*4),v=i=>bitsFloat(u(i)),vec=(i,n=3)=>Array.from({length:n},(_,k)=>v(i+k));
  const rider={flag140:u(1),field138:0,contactClass:u(2),matrix:vec(4,16),center:vec(36),extents:vec(39),extentScale:v(42),alternateVelocity:vec(43),velocity:vec(43),alternateAngular:vec(46),angular:vec(46)};
  const proxy={local:vec(4,16),world:Array(16).fill(0),cacheValid:0,parent:null,firstChild:null,nextSibling:null};
  const other={velocity:vec(58)},bike={state844:u(3),collision:{owner:0}};
  const collision={owner:1,type:0,matrix:vec(20,16),extents:[0,0,0],localCenter:[0,0,0],radius:0,radiusSquared:0,contactCC:vec(49),contactD8:vec(52),contactE4:vec(55),other:{collisionClass:u(0)}};
  const manager={pairs:[[0,0],[0,0]]};let staticCalls=0,gridCalls=0;
  primaryMcmNormalRiderCollision({rider,bike,other,collision,collisionType:u(0),proxy,manager,coefficients,zero,grid:{},gridEnabled:0,respond(){staticCalls++;},updateGrid(...args){gridCalls++;return updateMcmCollisionGrid(...args);}});
  const actual=[rider.flag140,rider.field138,rider.contactClass,...[...rider.matrix,...rider.velocity,...rider.angular,...proxy.local,...proxy.world].map(floatBits),proxy.cacheValid,...[...collision.extents,...collision.localCenter,collision.radius,collision.radiusSquared,...collision.matrix].map(floatBits),manager.pairs[0][1],manager.pairs[1][0],gridCalls,staticCalls];
  if(actual.length!==86)throw Error('Primary output layout');
  actual.forEach((a,i)=>{const expected=output.readUInt32LE(36+row*344+i*4);if((a>>>0)!==expected)differences.push({case:row,word:i,actual:a>>>0,expected});});
 }
 return {cases:count,words:count*86,differences};
}
