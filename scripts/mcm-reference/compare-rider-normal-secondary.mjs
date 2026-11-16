import {secondaryMcmNormalRiderCollision} from '../../src/physics/mcm/rider-normal-collision.js';
import {bitsFloat,floatBits} from '../../src/physics/mcm/math.js';
export function compareRiderNormalSecondary(input,output){
 const count=input.readUInt32LE();if(input.length!==4+count*40||output.length!==count*92)throw Error('Invalid normal rider corpus');
 const differences=[];
 for(let row=0;row<count;row++){
  const v=Array.from({length:10},(_,i)=>input.readUInt32LE(4+row*40+i*4)),calls=[];
  const bike={address:1,field8ac:v[1],field8b0:v[9]?2:0,field888:1.25,position:[0,bitsFloat(v[7]),0]};
  const other={address:2,field8ac:v[3]?0:v[2],field888:2.5,position:[0,bitsFloat(v[8]),0]},peer=v[3]?bike:other;
  const tag={player:v[5]?bike:other,holder:v[6]===1?bike:v[6]===2?other:null};
  secondaryMcmNormalRiderCollision({bike,other:peer,collisionType:v[0],tag:v[4]?tag:null,resetTag(){calls.push(2,1,tag.holder?.address??0,0);},notifyTag(a,b,flag){calls.push(3,a.address,b.address,flag);}});
  const actual=[bike.field8ac,bike.field8b0,floatBits(bike.field888),other.field8ac,floatBits(other.field888),tag.holder?.address??0,calls.length,...calls,...Array(16-calls.length).fill(0)];
  actual.forEach((a,i)=>{const expected=output.readUInt32LE(row*92+i*4);if((a>>>0)!==expected)differences.push({case:row,word:i,actual:a>>>0,expected});});
 }
 return {cases:count,words:count*23,differences};
}
