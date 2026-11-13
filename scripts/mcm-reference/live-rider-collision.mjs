import {checkpointMemory} from './live-checkpoint.mjs';
import {decodeRiderCollision} from './compare-rider-collision.mjs';
// Bind the two observed callback words, optionally the rider pair row/column.
// Never copy linked grid entries or claim complete collision/world closure.
export function bindRiderCollisionCallbacks(checkpoint,row,{pairs=false}={}){
 const m=checkpointMemory(checkpoint),bike=checkpoint.bikeAddress,rider=m.u32(bike+0x874),c=decodeRiderCollision(row);
 if(row.phase!=='before-update'||row.pass!==0||row.playerFrame!==0||parseInt(row.bike,16)!==bike||parseInt(row.riderAddress,16)!==rider||row.stateHex!==m.read(bike,0xcc8).toString('hex')||row.riderHex!==m.read(rider,0x3ac).toString('hex'))throw Error('Collision callback observation boundary differs');
 const slots=[0x874,0x8d8,0x8dc,0x8e0,0x8e4,0x8e8,0x8ec,0x8f0,0x8f8,0x8fc,0x900,0x904],addresses=new Set([bike,...slots.map(o=>m.u32(bike+o)).filter(Boolean)]);
 let index=0;while(index<checkpoint.blocks.length&&addresses.has(checkpoint.blocks[index].address))index++;
 if(index!==addresses.size)throw Error('Unsupported checkpoint discovery order');
 const result=structuredClone(checkpoint);delete result.captureId;delete result.captureBoundary;
 result.blocks.splice(index,0,{address:c.address+0x108,size:8,hex:c.state.subarray(0x108,0x110).toString('hex')});result.blockCount++;
 if(pairs){
  const blocks=[{address:c.managerAddress+0xf8+c.id*240,size:240,hex:c.pairRow.toString('hex')}];
  for(let i=0;i<60;i++)if(i!==c.id)blocks.push({address:c.managerAddress+0xf8+(i*60+c.id)*4,size:4,hex:c.pairColumn.subarray(i*4,i*4+4).toString('hex')});
  result.blocks.splice(index+1,0,...blocks);result.blockCount+=blocks.length;
 }
 checkpointMemory(result);return result;
}
