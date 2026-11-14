import {beginMcmRiderTick} from '../../src/physics/mcm/rider-tick-entry.js';
export function compareLiveRiderTickEntry(before,after){
 if(before.phase!=='before-rider-transition'||after.phase!=='after-rider-transition'||before.frame!==after.frame||before.rider!==after.rider||before.proxy!==after.proxy||before.record!==after.record||before.playerActive||after.playerActive)throw Error('Rider transition boundary differs');
 const bytes=Buffer.from(before.riderHex,'hex'),proxy=Buffer.from(before.proxyHex,'hex'),asset=Buffer.from(before.recordHex,'hex');
 if(bytes.length!==0x3ac||proxy.length!==0x438||asset.length!==0x78||bytes.readUInt32LE(0x160)!==before.record)throw Error('Invalid rider transition allocations');
 const rider={fieldf8:bytes.readFloatLE(0xf8)};
 for(const [key,o] of [['flag13c',0x13c],['field140',0x140],['field138',0x138],['field144',0x144],['field154',0x154]])rider[key]=bytes.readUInt32LE(o);
 const record={token:before.record,firstFrame:{token:asset.readUInt32LE(0x68)}};
 if(!record.firstFrame.token||!asset.readUInt32LE(0x6c))throw Error('Missing selected animation frame');
 const animation={stopped:proxy.readUInt32LE(4),record:{token:proxy.readUInt32LE(0x10)},frame:{token:proxy.readUInt32LE(0x14)},field30:proxy.readUInt32LE(0x30),blending:proxy.readUInt32LE(0x2c)};
 const entered=beginMcmRiderTick({rider,animation,selectedRecord:record});
 bytes.writeFloatLE(rider.fieldf8,0xf8);
 for(const [key,o] of [['flag13c',0x13c],['field140',0x140],['field138',0x138],['field144',0x144],['field154',0x154]])bytes.writeUInt32LE(rider[key]>>>0,o);
 for(const [o,v] of [[4,animation.stopped],[0x10,animation.record.token],[0x14,animation.frame.token],[0x30,animation.field30],[0x2c,animation.blending]])proxy.writeUInt32LE(v>>>0,o);
 const differences=[];let comparedWords=0,changedWords=0;
 for(const [name,expected] of [['riderHex',bytes],['proxyHex',proxy]]){
  const previous=Buffer.from(before[name],'hex'),original=Buffer.from(after[name],'hex');if(original.length!==expected.length)throw Error('Rider output size differs');
  for(let o=0;o<expected.length;o+=4){comparedWords++;if(previous.readUInt32LE(o)!==original.readUInt32LE(o))changedWords++;if(expected.readUInt32LE(o)!==original.readUInt32LE(o))differences.push({object:name,offset:o.toString(16),original:original.readUInt32LE(o),recovered:expected.readUInt32LE(o)});}
 }
 return {scope:'Selected-animation crash entry of the separate original rider tick. Complete observed rider and proxy allocations compared; not the complete rider tick, collision world or retained crash trajectory.',entered,comparedWords,changedWords,differences:differences.length,firstDifferences:differences};
}
